import { useEffect, useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { ChevronDown } from "lucide-react";
import type { AudioSettings, AudioDevice } from "../types/audio";

interface SettingsMenuProps {
	onClose: () => void;
}

interface MidiInputDevice {
	id: string;
	name: string;
}

export default function SettingsMenu({ onClose: _onClose }: SettingsMenuProps) {
	const [settings, setSettings] = useState<AudioSettings | null>(null);
	const [audioDevices, setAudioDevices] = useState<AudioDevice[]>([]);
	const [audioHosts, setAudioHosts] = useState<string[]>([]);
	const [midiInputDevices, setMidiInputDevices] = useState<MidiInputDevice[]>([]);
	const [expandedSection, setExpandedSection] = useState<string | null>(
		"audio",
	);

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
		void loadAudioHosts();
		void loadMidiInputDevices();
	}, [loadSettings, loadAudioDevices, loadAudioHosts, loadMidiInputDevices]);

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
		<div className="space-y-3">
			<div className="border border-slate-700 rounded-lg">
				<button
					type="button"
					onClick={() =>
						setExpandedSection(
							expandedSection === "audio" ? null : "audio",
						)
					}
					className="w-full px-4 py-2 flex items-center justify-between hover:bg-slate-700/50 transition-colors"
				>
					<span className="font-semibold text-sm">Audio Settings</span>
					<ChevronDown
						size={18}
						className={`transition-transform ${
							expandedSection === "audio" ? "rotate-180" : ""
						}`}
					/>
				</button>

				{expandedSection === "audio" && (
					<div className="px-4 py-3 border-t border-slate-700 space-y-3 bg-slate-900/50">
						{/* Audio Driver */}
						<div>
							<label
								htmlFor="audio-driver"
								className="block text-xs font-medium text-slate-400 mb-1"
							>
								Audio Driver
							</label>
							<select
								id="audio-driver"
								value={settings.audio_driver || "default"}
								onChange={(e) =>
									void updateSetting("audio_driver", e.target.value)
								}
								className="select select-sm select-bordered w-full bg-slate-800 border-slate-600"
							>
								<option value="default">Default</option>
								{audioHosts.map((host) => (
									<option key={host} value={host.toLowerCase()}>
										{host}
									</option>
								))}
							</select>
						</div>

						{/* Audio Device */}
						<div>
							<label
								htmlFor="audio-device"
								className="block text-xs font-medium text-slate-400 mb-1"
							>
								Output Device
							</label>
							<select
								id="audio-device"
								value={settings.audio_device || "default"}
								onChange={(e) =>
									void updateSetting("audio_device", e.target.value)
								}
								className="select select-sm select-bordered w-full bg-slate-800 border-slate-600"
							>
								<option value="default">Default</option>
								{audioDevices.map((device) => (
									<option key={device.id} value={device.id}>
										{device.name}
									</option>
								))}
							</select>
						</div>

						{/* Input Channels */}
						<div>
							<label
								htmlFor="input-channels"
								className="block text-xs font-medium text-slate-400 mb-1"
							>
								Input Channels
							</label>
							<input
								id="input-channels"
								type="number"
								min="0"
								max="8"
								value={settings.input_channels || 0}
								onChange={(e) =>
									void updateSetting(
										"input_channels",
										parseInt(e.target.value),
									)
								}
								className="input input-sm input-bordered w-full bg-slate-800 border-slate-600"
							/>
						</div>

						{/* Buffer Size */}
						<div>
							<label
								htmlFor="buffer-size"
								className="block text-xs font-medium text-slate-400 mb-1"
							>
								Buffer Size
							</label>
							<select
								id="buffer-size"
								value={settings.buffer_size || 512}
								onChange={(e) =>
									void updateSetting(
										"buffer_size",
										parseInt(e.target.value),
									)
								}
								className="select select-sm select-bordered w-full bg-slate-800 border-slate-600"
							>
								<option value="128">128</option>
								<option value="256">256</option>
								<option value="512">512</option>
								<option value="1024">1024</option>
								<option value="2048">2048</option>
							</select>
						</div>

						{/* Sample Rate */}
						<div>
							<label
								htmlFor="sample-rate"
								className="block text-xs font-medium text-slate-400 mb-1"
							>
								Sample Rate (Hz)
							</label>
							<select
								id="sample-rate"
								value={settings.sample_rate || 44100}
								onChange={(e) =>
									void updateSetting(
										"sample_rate",
										parseInt(e.target.value),
									)
								}
								className="select select-sm select-bordered w-full bg-slate-800 border-slate-600"
							>
								<option value="44100">44100</option>
								<option value="48000">48000</option>
								<option value="96000">96000</option>
							</select>
						</div>
					</div>
				)}
			</div>

			<div className="border border-slate-700 rounded-lg">
				<button
					type="button"
					onClick={() =>
						setExpandedSection(expandedSection === "midi" ? null : "midi")
					}
					className="w-full px-4 py-2 flex items-center justify-between hover:bg-slate-700/50 transition-colors"
				>
					<span className="font-semibold text-sm">MIDI Settings</span>
					<ChevronDown
						size={18}
						className={`transition-transform ${
							expandedSection === "midi" ? "rotate-180" : ""
						}`}
					/>
				</button>

				{expandedSection === "midi" && (
					<div className="px-4 py-3 border-t border-slate-700 space-y-3 bg-slate-900/50">
						<div>
							<label
								htmlFor="midi-input-device"
								className="block text-xs font-medium text-slate-400 mb-1"
							>
								MIDI Input Device
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
							<p className="mt-1 text-2xs text-slate-500">
								Select which MIDI input device should trigger notes.
							</p>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
