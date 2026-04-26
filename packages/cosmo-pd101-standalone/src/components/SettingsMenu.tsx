import { invoke } from "@tauri-apps/api/core";
import { useCallback, useEffect, useState } from "react";
import type { AudioDevice, AudioSettings } from "../types/audio";

interface SettingsMenuProps {
	onClose: () => void;
}

interface MidiInputDevice {
	id: string;
	name: string;
}

interface AudioOutputDevice {
	id: string;
	name: string;
}

interface OutputDeviceOption {
	id: string;
	name: string;
}

function normalizeDeviceName(value: string) {
	return value.trim().toLowerCase();
}

export default function SettingsMenu({ onClose: _onClose }: SettingsMenuProps) {
	const [settings, setSettings] = useState<AudioSettings | null>(null);
	const [audioDevices, setAudioDevices] = useState<AudioDevice[]>([]);
	const [audioOutputDevices, setAudioOutputDevices] = useState<
		AudioOutputDevice[]
	>([]);
	const [audioHosts, setAudioHosts] = useState<string[]>([]);
	const [midiInputDevices, setMidiInputDevices] = useState<MidiInputDevice[]>(
		[],
	);
	const supportsContextSinkSelection =
		typeof (
			AudioContext.prototype as AudioContext & {
				setSinkId?: (sinkId: string) => Promise<void>;
			}
		).setSinkId === "function";
	const supportsElementSinkSelection =
		typeof (
			HTMLMediaElement.prototype as HTMLMediaElement & {
				setSinkId?: (sinkId: string) => Promise<void>;
			}
		).setSinkId === "function";
	const supportsSinkSelection =
		supportsContextSinkSelection || supportsElementSinkSelection;

	const outputDeviceOptions: OutputDeviceOption[] =
		audioOutputDevices.length > 0
			? audioOutputDevices
			: audioDevices
					.filter((device) => device.id !== "default")
					.map((device) => ({ id: device.id, name: device.name }));
	const selectedOutputSinkDeviceName = outputDeviceOptions.find(
		(device) => device.id === (settings?.audio_device || "default"),
	)?.name;
	const selectedOutputDevice =
		audioDevices.find(
			(device) =>
				normalizeDeviceName(device.name) ===
				normalizeDeviceName(selectedOutputSinkDeviceName || ""),
		) || audioDevices.find((device) => device.id === "default");
	const outputChannels = Math.max(2, selectedOutputDevice?.channels || 2);
	const outputChannelOptions = Array.from(
		{ length: Math.floor(outputChannels / 2) },
		(_, index) => index * 2 + 1,
	);
	const selectedOutputChannelStart = outputChannelOptions.includes(
		settings?.output_channel_start || 1,
	)
		? settings?.output_channel_start || 1
		: 1;

	const driverOptions =
		audioHosts.length > 0
			? audioHosts.map((host) => ({ label: host, value: host.toLowerCase() }))
			: [{ label: "CoreAudio", value: "coreaudio" }];
	const selectedAudioDriver =
		settings?.audio_driver && settings.audio_driver !== "default"
			? settings.audio_driver
			: driverOptions[0]?.value || "coreaudio";
	const selectedAudioDevice =
		outputDeviceOptions.find((device) => device.id === settings?.audio_device)
			?.id || "default";

	const loadSettings = useCallback(async () => {
		try {
			const loaded: AudioSettings = await invoke("get_audio_settings");
			setSettings(loaded);
		} catch (error) {
			console.error("Failed to load audio settings:", error);
		}
	}, []);

	const loadAudioHosts = useCallback(async () => {
		try {
			const hosts: string[] = await invoke("enumerate_audio_hosts");
			setAudioHosts(hosts);
		} catch (error) {
			console.error("Failed to enumerate audio hosts:", error);
		}
	}, []);

	const loadAudioDevices = useCallback(async () => {
		try {
			const devices: AudioDevice[] = await invoke("enumerate_audio_devices");
			setAudioDevices(devices);
		} catch (error) {
			console.error("Failed to enumerate audio devices:", error);
		}
	}, []);

	const loadAudioOutputDevices = useCallback(async () => {
		if (
			!("mediaDevices" in navigator) ||
			!navigator.mediaDevices.enumerateDevices
		) {
			setAudioOutputDevices([]);
			return;
		}

		try {
			const devices = await navigator.mediaDevices.enumerateDevices();
			const outputs = devices
				.filter((device) => device.kind === "audiooutput")
				.map((device, index) => ({
					id: device.deviceId,
					name: device.label || `Output Device ${index + 1}`,
				}));
			setAudioOutputDevices(outputs);
		} catch (error) {
			console.error("Failed to enumerate audio output devices:", error);
			setAudioOutputDevices([]);
		}
	}, []);

	const loadMidiInputDevices = useCallback(async () => {
		if (!("requestMIDIAccess" in navigator) || !navigator.requestMIDIAccess) {
			setMidiInputDevices([]);
			return;
		}

		try {
			const midiAccess = await navigator.requestMIDIAccess({ sysex: false });
			const inputs = Array.from(midiAccess.inputs.values()).map((input) => ({
				id: input.id,
				name: input.name || "Unnamed MIDI Input",
			}));
			setMidiInputDevices(inputs);

			midiAccess.onstatechange = () => {
				void loadMidiInputDevices();
			};
		} catch (error) {
			console.error("Failed to enumerate MIDI inputs:", error);
			setMidiInputDevices([]);
		}
	}, []);

	useEffect(() => {
		void loadSettings();
		void loadAudioDevices();
		void loadAudioOutputDevices();
		void loadAudioHosts();
		void loadMidiInputDevices();

		if (navigator.mediaDevices?.addEventListener) {
			const onDeviceChange = () => {
				void loadAudioOutputDevices();
			};
			navigator.mediaDevices.addEventListener("devicechange", onDeviceChange);
			return () => {
				navigator.mediaDevices.removeEventListener(
					"devicechange",
					onDeviceChange,
				);
			};
		}
	}, [
		loadSettings,
		loadAudioDevices,
		loadAudioOutputDevices,
		loadAudioHosts,
		loadMidiInputDevices,
	]);

	async function updateSetting(key: string, value: unknown) {
		try {
			await invoke("update_audio_setting", { key, value });
			await loadSettings();
		} catch (error) {
			console.error("Failed to update setting:", error);
		}
	}

	if (!settings) {
		return <div className="text-slate-400">Loading settings...</div>;
	}

	return (
		<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
			<section className="rounded-lg border border-slate-700 bg-slate-900/60 p-4">
				<h2 className="mb-1 text-sm font-semibold text-slate-100">
					Audio Settings
				</h2>
				<p className="mb-4 text-xs text-slate-400">
					Adjust the audio settings to your setup.
				</p>

				<div className="space-y-3">
					<div className="grid grid-cols-[120px_1fr] items-center gap-3">
						<label htmlFor="audio-driver" className="text-xs text-slate-300">
							Audio Driver
						</label>
						<select
							id="audio-driver"
							value={selectedAudioDriver}
							onChange={(e) =>
								void updateSetting("audio_driver", e.target.value)
							}
							className="select select-sm select-bordered w-full bg-slate-800 border-slate-600"
						>
							{driverOptions.map((option) => (
								<option key={option.value} value={option.value}>
									{option.label}
								</option>
							))}
						</select>
					</div>

					<div className="grid grid-cols-[120px_1fr] items-center gap-3">
						<label htmlFor="audio-device" className="text-xs text-slate-300">
							Audio Device
						</label>
						<select
							id="audio-device"
							value={selectedAudioDevice}
							onChange={(e) =>
								void updateSetting("audio_device", e.target.value)
							}
							className="select select-sm select-bordered w-full bg-slate-800 border-slate-600"
						>
							<option value="default">System Default</option>
							{outputDeviceOptions.map((device) => (
								<option key={device.id} value={device.id}>
									{device.name}
								</option>
							))}
						</select>
					</div>

					{!supportsSinkSelection && (
						<p className="text-2xs text-slate-500">
							This WebView does not expose audio sink switching. The app will
							follow the OS default output.
						</p>
					)}

					<div className="grid grid-cols-[120px_1fr] items-center gap-3">
						<label htmlFor="output-channels" className="text-xs text-slate-300">
							Output Channels
						</label>
						<select
							id="output-channels"
							value={selectedOutputChannelStart}
							onChange={(e) =>
								void updateSetting(
									"output_channel_start",
									parseInt(e.target.value, 10),
								)
							}
							className="select select-sm select-bordered w-full bg-slate-800 border-slate-600"
						>
							{outputChannelOptions.map((startChannel) => (
								<option key={startChannel} value={startChannel}>
									Channel {startChannel} + {startChannel + 1}
								</option>
							))}
						</select>
					</div>

					<div className="grid grid-cols-[120px_1fr] items-center gap-3">
						<label htmlFor="buffer-size" className="text-xs text-slate-300">
							Buffer Size
						</label>
						<select
							id="buffer-size"
							value={settings.buffer_size || 512}
							onChange={(e) =>
								void updateSetting("buffer_size", parseInt(e.target.value, 10))
							}
							className="select select-sm select-bordered w-full bg-slate-800 border-slate-600"
						>
							<option value="64">64 samples</option>
							<option value="128">128 samples</option>
							<option value="256">256 samples</option>
							<option value="512">512 samples</option>
							<option value="1024">1024 samples</option>
							<option value="2048">2048 samples</option>
						</select>
					</div>

					<div className="grid grid-cols-[120px_1fr] items-center gap-3">
						<label htmlFor="sample-rate" className="text-xs text-slate-300">
							Sample Rate
						</label>
						<select
							id="sample-rate"
							value={settings.sample_rate || 44100}
							onChange={(e) =>
								void updateSetting("sample_rate", parseInt(e.target.value, 10))
							}
							className="select select-sm select-bordered w-full bg-slate-800 border-slate-600"
						>
							<option value="44100">44100 Hz</option>
							<option value="48000">48000 Hz</option>
							<option value="96000">96000 Hz</option>
						</select>
					</div>
				</div>
			</section>

			<section className="rounded-lg border border-slate-700 bg-slate-900/60 p-4">
				<h2 className="mb-1 text-sm font-semibold text-slate-100">
					MIDI Settings
				</h2>
				<p className="mb-4 text-xs text-slate-400">
					Select the MIDI input used by your controller.
				</p>

				<div className="grid grid-cols-[120px_1fr] items-center gap-3">
					<label htmlFor="midi-input-device" className="text-xs text-slate-300">
						MIDI Port
					</label>
					<select
						id="midi-input-device"
						value={settings.midi_input_device || "all"}
						onChange={(e) =>
							void updateSetting("midi_input_device", e.target.value)
						}
						className="select select-sm select-bordered w-full bg-slate-800 border-slate-600"
					>
						<option value="all">All MIDI Inputs</option>
						{midiInputDevices.map((device) => (
							<option key={device.id} value={device.id}>
								{device.name}
							</option>
						))}
					</select>
				</div>
			</section>
		</div>
	);
}
