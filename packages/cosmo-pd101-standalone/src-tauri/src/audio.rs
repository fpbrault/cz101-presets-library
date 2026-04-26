use crossbeam::queue::ArrayQueue;
use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use std::sync::Mutex;
use tauri::Emitter;

lazy_static::lazy_static! {
	static ref AUDIO_SETTINGS: Mutex<AudioSettings> = Mutex::new(AudioSettings {
		audio_driver: Some("default".to_string()),
		audio_device: Some("default".to_string()),
		midi_input_device: Some("all".to_string()),
		output_channel_start: Some(1),
		buffer_size: Some(512),
		sample_rate: Some(44100),
	});
	static ref CPAL_STREAM: Mutex<Option<CpalOutputStream>> = Mutex::new(None);
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AudioDevice {
	pub id: String,
	pub name: String,
	pub channels: u32,
	pub sample_rate: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AudioSettings {
	pub audio_driver: Option<String>,
	pub audio_device: Option<String>,
	pub midi_input_device: Option<String>,
	pub output_channel_start: Option<u32>,
	pub buffer_size: Option<u32>,
	pub sample_rate: Option<u32>,
}

/// Info returned to the webview after a cpal output stream is started.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CpalStreamInfo {
	pub sample_rate: u32,
	pub channels: u16,
}

/// A live cpal output stream plus the channel used to push PCM samples into it.
struct CpalOutputStream {
	/// Must be kept alive — drop() stops the stream.
	_stream: cpal::Stream,
	queue: Arc<ArrayQueue<Vec<f32>>>,
	channels: u16,
}

#[allow(deprecated)]
#[tauri::command]
pub async fn enumerate_audio_devices() -> Result<Vec<AudioDevice>, String> {
	use cpal::traits::{DeviceTrait, HostTrait};

	let host = cpal::default_host();
	let mut devices = vec![AudioDevice {
		id: "default".to_string(),
		name: "Default".to_string(),
		channels: 2,
		sample_rate: 44100,
	}];

	let output_devices = host
		.output_devices()
		.map_err(|e| format!("Failed to enumerate devices: {e}"))?;

	for device in output_devices {
		let name = device.name().unwrap_or_else(|_| "Unknown".to_string());
		if name == "default" {
			continue;
		}
		let (channels, sample_rate) = device
			.default_output_config()
			.map(|c| (c.channels() as u32, c.sample_rate()))
			.unwrap_or((2, 44100));
		devices.push(AudioDevice {
			id: name.clone(),
			name,
			channels,
			sample_rate,
		});
	}

	Ok(devices)
}

#[tauri::command]
pub async fn enumerate_audio_hosts() -> Result<Vec<String>, String> {
	Ok(cpal::available_hosts()
		.iter()
		.map(|h| h.name().to_string())
		.collect())
}

#[tauri::command]
pub async fn get_audio_settings() -> Result<AudioSettings, String> {
	AUDIO_SETTINGS
		.lock()
		.map(|settings| settings.clone())
		.map_err(|e| format!("Failed to get settings: {}", e))
}

#[tauri::command]
pub async fn update_audio_setting(
	app: tauri::AppHandle,
	key: String,
	value: serde_json::Value,
) -> Result<(), String> {
	let mut settings = AUDIO_SETTINGS
		.lock()
		.map_err(|e| format!("Failed to lock settings: {}", e))?;

	match key.as_str() {
		"audio_driver" => {
			settings.audio_driver = value.as_str().map(|s| s.to_string());
		}
		"audio_device" => {
			settings.audio_device = value.as_str().map(|s| s.to_string());
		}
		"midi_input_device" => {
			settings.midi_input_device = value.as_str().map(|s| s.to_string());
		}
		"output_channel_start" => {
			settings.output_channel_start = value.as_u64().map(|n| n as u32);
		}
		"buffer_size" => {
			settings.buffer_size = value.as_u64().map(|n| n as u32);
		}
		"sample_rate" => {
			settings.sample_rate = value.as_u64().map(|n| n as u32);
		}
		_ => return Err(format!("Unknown setting: {}", key)),
	}

	let snapshot = settings.clone();
	app.emit("audio-settings-updated", snapshot)
		.map_err(|e| format!("Failed to emit settings update: {e}"))?;

	Ok(())
}

// ─── cpal output stream management ───────────────────────────────────────────

/// Open (or reopen) a cpal output stream on `device_name`.
///
/// The webview should subsequently call `push_audio_samples` on every
/// ScriptProcessorNode callback to feed PCM into the stream.
///
/// Returns the stream's actual sample rate and channel count so the caller
/// can configure the Web Audio `AudioContext` to match.
#[tauri::command]
pub fn start_cpal_output(device_name: String) -> Result<CpalStreamInfo, String> {
	let host = cpal::default_host();

	let device = if device_name == "default" {
		host.default_output_device()
			.ok_or_else(|| "No default audio output device found".to_string())?
	} else {
		host.output_devices()
			.map_err(|e| format!("Failed to enumerate output devices: {e}"))?
			.find(|d| d.name().ok().as_deref() == Some(device_name.as_str()))
			.ok_or_else(|| format!("Audio device not found: {device_name}"))?
	};

	let supported = device
		.default_output_config()
		.map_err(|e| format!("Failed to get device output config: {e}"))?;

	let sample_rate = supported.sample_rate();
	let channels = supported.channels();

	let stream_config = cpal::StreamConfig {
		channels,
		sample_rate,
		buffer_size: cpal::BufferSize::Default,
	};

	// Ring buffer: low-latency strategy. On overflow we drop oldest chunks to keep
	// latency bounded instead of accumulating stale audio.
	let queue = Arc::new(ArrayQueue::<Vec<f32>>::new(128));
	let queue_for_callback = Arc::clone(&queue);
	let mut pending: Vec<f32> = Vec::with_capacity(8192);

	let stream = match supported.sample_format() {
		cpal::SampleFormat::F32 => device
			.build_output_stream(
				&stream_config,
				{
					let mut last_sample = 0.0f32;
					move |data: &mut [f32], _info| {
					while let Some(chunk) = queue_for_callback.pop() {
						pending.extend_from_slice(&chunk);
					}
					let n = pending.len().min(data.len());
					data[..n].copy_from_slice(&pending[..n]);
					if n > 0 {
						last_sample = data[n - 1];
					}
					pending.drain(..n);
					for s in &mut data[n..] {
						*s = last_sample;
					}
					}
				},
				|err| eprintln!("[cpal] Output stream error: {err}"),
				None,
			)
			.map_err(|e| format!("Failed to build F32 output stream: {e}"))?,
		cpal::SampleFormat::I16 => device
			.build_output_stream(
				&stream_config,
				{
					let queue_for_callback = Arc::clone(&queue);
					let mut last_sample = 0i16;
					move |data: &mut [i16], _info| {
					while let Some(chunk) = queue_for_callback.pop() {
						pending.extend_from_slice(&chunk);
					}
					let n = pending.len().min(data.len());
					for (i, s) in data[..n].iter_mut().enumerate() {
						*s = (pending[i].clamp(-1.0, 1.0) * i16::MAX as f32) as i16;
						last_sample = *s;
					}
					pending.drain(..n);
					for s in &mut data[n..] {
						*s = last_sample;
					}
					}
				},
				|err| eprintln!("[cpal] Output stream error: {err}"),
				None,
			)
			.map_err(|e| format!("Failed to build I16 output stream: {e}"))?,
		fmt => return Err(format!("Unsupported device sample format: {fmt:?}")),
	};

	stream
		.play()
		.map_err(|e| format!("Failed to start audio stream: {e}"))?;

	*CPAL_STREAM
		.lock()
		.map_err(|e| format!("Lock error: {e}"))? = Some(CpalOutputStream {
		_stream: stream,
		queue,
		channels,
	});

	Ok(CpalStreamInfo {
		sample_rate,
		channels,
	})
}

/// Push stereo-interleaved F32 PCM samples (L0, R0, L1, R1, …) into the
/// active cpal output stream.  Channel count expansion/contraction to match
/// the device is handled here.
#[tauri::command]
pub fn push_audio_samples(samples: Vec<f32>) -> Result<(), String> {
	let guard = CPAL_STREAM
		.lock()
		.map_err(|e| format!("Lock error: {e}"))?;

	if let Some(state) = guard.as_ref() {
		let data = match state.channels {
			1 => {
				// Stereo → mono: average L + R
				samples
					.chunks(2)
					.map(|c| (c[0] + c.get(1).copied().unwrap_or(0.0)) * 0.5)
					.collect()
			}
			2 => samples,
			n => {
				// Stereo → N channels: copy to ch 0/1, silence the rest
				let frames = samples.len() / 2;
				let mut expanded = vec![0.0f32; frames * n as usize];
				for i in 0..frames {
					expanded[i * n as usize] = samples[i * 2];
					expanded[i * n as usize + 1] = samples.get(i * 2 + 1).copied().unwrap_or(0.0);
				}
				expanded
			}
		};
		if let Err(data) = state.queue.push(data) {
			let _ = state.queue.pop();
			let _ = state.queue.push(data);
		}
	}
	Ok(())
}

/// Stop the active cpal output stream (e.g. when closing the app or when
/// the webview takes back control via `setSinkId`).
#[tauri::command]
pub fn stop_cpal_output() -> Result<(), String> {
	*CPAL_STREAM
		.lock()
		.map_err(|e| format!("Lock error: {e}"))? = None;
	Ok(())
}
