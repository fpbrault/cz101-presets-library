use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::Emitter;

lazy_static::lazy_static! {
	static ref AUDIO_SETTINGS: Mutex<AudioSettings> = Mutex::new(AudioSettings {
		audio_driver: Some("default".to_string()),
		audio_device: Some("default".to_string()),
		midi_input_device: Some("all".to_string()),
		input_channels: Some(0),
		buffer_size: Some(512),
		sample_rate: Some(44100),
	});
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
	pub input_channels: Option<u32>,
	pub buffer_size: Option<u32>,
	pub sample_rate: Option<u32>,
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
		"input_channels" => {
			settings.input_channels = value.as_u64().map(|n| n as u32);
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
