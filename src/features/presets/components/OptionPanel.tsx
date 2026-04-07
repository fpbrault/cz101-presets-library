import type React from "react";
import { useState } from "react";
import SelectInput from "@/components/forms/SelectInput";
import Button from "@/components/ui/Button";
import { useMidiChannel } from "@/context/MidiChannelContext";
import { useMidiPort } from "@/context/MidiPortContext";
import type { Preset } from "@/lib/presets/presetManager";
import { saveToLocalStorage } from "@/utils/utils";

interface OptionPanelProps {
	autoSend: boolean;
	handleToggleAutoSend: () => void;
	handleSendCurrentPreset: () => void;
	currentPreset: Preset | null;
	handleRetrieveCurrentPreset: () => void;
	handleRetrievePresetSlot: (
		bank: "internal" | "cartridge",
		slot: number,
	) => void;
	handleWritePresetSlot: (bank: "internal" | "cartridge", slot: number) => void;
}

const OptionPanel: React.FC<OptionPanelProps> = ({
	autoSend,
	handleSendCurrentPreset,
	handleToggleAutoSend,
	currentPreset,
	handleRetrieveCurrentPreset,
	handleRetrievePresetSlot,
	handleWritePresetSlot,
}) => {
	const { midiPorts, selectedMidiPort, setSelectedMidiPort } = useMidiPort();
	const { selectedMidiChannel, setSelectedMidiChannel } = useMidiChannel();
	const [isRetrieveModalOpen, setIsRetrieveModalOpen] = useState(false);
	const [isWriteModalOpen, setIsWriteModalOpen] = useState(false);

	const handleOpenRetrieveModal = () => setIsRetrieveModalOpen(true);
	const handleCloseRetrieveModal = () => setIsRetrieveModalOpen(false);
	const handleOpenWriteModal = () => setIsWriteModalOpen(true);
	const handleCloseWriteModal = () => setIsWriteModalOpen(false);

	const [slotBank, setSlotBank] = useState<"internal" | "cartridge">(
		"internal",
	);

	return (
		<>
			<div className="flex flex-col gap-2">
				<Button onClick={handleSendCurrentPreset} variant="primary">
					Send Preset
				</Button>
				<div className="form-control w-52">
					<label className="cursor-pointer label">
						<span className="label-text">Auto Send</span>
						<input
							type="checkbox"
							className="toggle toggle-secondary toggle-lg"
							checked={autoSend}
							onChange={handleToggleAutoSend}
						/>
					</label>
				</div>
				<SelectInput
					value={selectedMidiPort}
					onChange={(e) => {
						setSelectedMidiPort(e.target.value);
						saveToLocalStorage("selectedMidiPort", e.target.value);
					}}
				>
					{midiPorts.map((port) => (
						<option key={port} value={port}>
							{port}
						</option>
					))}
				</SelectInput>
				<SelectInput
					value={selectedMidiChannel}
					onChange={(e) => {
						const channel = parseInt(e.target.value, 10);
						setSelectedMidiChannel(channel);
						saveToLocalStorage("selectedMidiChannel", channel);
					}}
				>
					{[...Array(16)]
						.map((_, i) => i + 1)
						.map((ch) => (
							<option key={`ch-${ch}`} value={ch}>
								Channel {ch}
							</option>
						))}
				</SelectInput>
				<Button onClick={handleRetrieveCurrentPreset} variant="accent">
					Retrieve Current
				</Button>
				<Button onClick={handleOpenRetrieveModal} variant="secondary">
					Retrieve Slot
				</Button>
				<Button
					onClick={handleOpenWriteModal}
					variant="info"
					disabled={!currentPreset}
					title={
						currentPreset
							? "Write selected preset to synth slot"
							: "Select a preset to enable slot write"
					}
				>
					Write To Slot
				</Button>
			</div>

			{isRetrieveModalOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
					<div className="p-4 shadow-lg bg-base-100 rounded-xl">
						<h2 className="mb-4 text-xl">Retrieve Preset Slot</h2>
						<div className="mb-4">
							<label className="label" htmlFor="retrieve-slot-bank">
								<span className="label-text">Bank</span>
							</label>
							<SelectInput
								id="retrieve-slot-bank"
								value={slotBank}
								onChange={(e) =>
									setSlotBank(e.target.value as "internal" | "cartridge")
								}
							>
								<option value="internal">Internal</option>
								<option value="cartridge">Cartridge</option>
							</SelectInput>
						</div>
						<div className="grid grid-cols-4 gap-2">
							{[...Array(16)]
								.map((_, i) => i + 1)
								.map((slot) => (
									<Button
										key={`slot-${slot}`}
										onClick={() => {
											handleRetrievePresetSlot(slotBank, slot);
											handleCloseRetrieveModal();
										}}
										variant="primary"
										className="text-2xl font-bold"
									>
										{slot}
									</Button>
								))}
						</div>
						<Button
							onClick={handleCloseRetrieveModal}
							variant="error"
							className="mt-4"
						>
							Close
						</Button>
					</div>
				</div>
			)}

			{isWriteModalOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
					<div className="p-4 shadow-lg bg-base-100 rounded-xl">
						<h2 className="mb-4 text-xl">Write Preset To Slot</h2>
						<div className="mb-4">
							<label className="label" htmlFor="write-slot-bank">
								<span className="label-text">Bank</span>
							</label>
							<SelectInput
								id="write-slot-bank"
								value={slotBank}
								onChange={(e) =>
									setSlotBank(e.target.value as "internal" | "cartridge")
								}
							>
								<option value="internal">Internal</option>
								<option value="cartridge">Cartridge</option>
							</SelectInput>
						</div>
						<div className="grid grid-cols-4 gap-2">
							{[...Array(16)]
								.map((_, i) => i + 1)
								.map((slot) => (
									<Button
										key={`slot-${slot}`}
										onClick={() => {
											handleWritePresetSlot(slotBank, slot);
											handleCloseWriteModal();
										}}
										variant="primary"
										className="text-2xl font-bold"
									>
										{slot}
									</Button>
								))}
						</div>
						<Button
							onClick={handleCloseWriteModal}
							variant="error"
							className="mt-4"
						>
							Close
						</Button>
					</div>
				</div>
			)}
		</>
	);
};

export default OptionPanel;
