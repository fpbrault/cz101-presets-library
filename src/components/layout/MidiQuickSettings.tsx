import { useState } from "react";
import { FaBroadcastTower } from "react-icons/fa";
import SelectInput from "@/components/forms/SelectInput";
import Button from "@/components/ui/Button";
import { useMidiChannel } from "@/context/MidiChannelContext";
import { useMidiPort } from "@/context/MidiPortContext";
import { saveToLocalStorage } from "@/utils/utils";

interface MidiQuickSettingsProps {
	minimalTrigger?: boolean;
}

export default function MidiQuickSettings({
	minimalTrigger = false,
}: MidiQuickSettingsProps) {
	const [isOpen, setIsOpen] = useState(false);
	const { midiPorts, selectedMidiPort, setSelectedMidiPort } = useMidiPort();
	const { selectedMidiChannel, setSelectedMidiChannel } = useMidiChannel();

	return (
		<>
			{minimalTrigger ? (
				<Button
					type="button"
					unstyled
					onClick={() => setIsOpen(true)}
					title="MIDI Quick Settings"
					className="grid size-9 place-items-center text-base-content/55 transition-colors hover:text-warning"
				>
					<FaBroadcastTower size={16} />
				</Button>
			) : (
				<Button
					onClick={() => setIsOpen(true)}
					variant="secondary"
					size="sm"
					className="gap-2"
					title="MIDI Quick Settings"
				>
					<FaBroadcastTower size={14} /> MIDI
				</Button>
			)}

			{isOpen && (
				<dialog open className="modal modal-open">
					<div className="modal-box w-[min(96vw,520px)] max-w-none rounded-2xl bg-base-100 p-6 shadow-xl">
						<h2 className="mb-4 text-center text-2xl font-semibold">
							MIDI Quick Settings
						</h2>
						<div className="space-y-4">
							<div>
								<div className="label">
									<span className="label-text">MIDI Output Port</span>
								</div>
								<SelectInput
									value={selectedMidiPort}
									onChange={(e) => {
										setSelectedMidiPort(e.target.value);
										saveToLocalStorage("selectedMidiPort", e.target.value);
									}}
								>
									{midiPorts.length === 0 ? (
										<option value="">No MIDI ports detected</option>
									) : (
										midiPorts.map((port) => (
											<option key={port} value={port}>
												{port}
											</option>
										))
									)}
								</SelectInput>
							</div>

							<div>
								<div className="label">
									<span className="label-text">MIDI Channel</span>
								</div>
								<SelectInput
									value={selectedMidiChannel}
									onChange={(e) => {
										const channel = parseInt(e.target.value, 10);
										setSelectedMidiChannel(channel);
										saveToLocalStorage("selectedMidiChannel", channel);
									}}
								>
									{Array.from({ length: 16 }, (_, i) => i + 1).map((channel) => (
										<option key={`midi-channel-${channel}`} value={channel}>
											Channel {channel}
										</option>
									))}
								</SelectInput>
							</div>

							<Button className="w-full" variant="primary" onClick={() => setIsOpen(false)}>
								Done
							</Button>
						</div>
					</div>
					<form method="dialog" className="modal-backdrop">
						<Button type="button" onClick={() => setIsOpen(false)} unstyled>
							close
						</Button>
					</form>
				</dialog>
			)}
		</>
	);
}
