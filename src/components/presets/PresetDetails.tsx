// src/PresetDetails.tsx

import { useQueryClient } from "@tanstack/react-query";
import type React from "react";
import { useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import PatchParameterViewer from "@/components/charts/PatchParameterViewer";
import FormField from "@/components/forms/FormField";
import SelectInput from "@/components/forms/SelectInput";
import TextAreaInput from "@/components/forms/TextAreaInput";
import TextInput from "@/components/forms/TextInput";
import Button from "@/components/ui/Button";
import KeyValueBlock from "@/components/ui/KeyValueBlock";
import { type Preset, updatePreset } from "@/lib/presets/presetManager";
import { buf2hex } from "@/utils/utils";

interface PresetFormData {
	name: string;
	filename: string;
	tags: string;
	description: string;
	author: string;
	createdDate: string;
	modifiedDate: string;
}

interface PresetDetailsProps {
	currentPreset: Preset | null;
	editMode: boolean;
	onPresetUpdated: (preset: Preset) => void;
	setEditMode: (editMode: boolean) => void;
	setShowDeleteModal: (show: boolean) => void;
	onWritePresetSlot: (bank: "internal" | "cartridge", slot: number) => void;
}

const PresetDetails: React.FC<PresetDetailsProps> = ({
	currentPreset,
	editMode,
	onPresetUpdated,
	setEditMode,
	setShowDeleteModal,
	onWritePresetSlot,
}) => {
	const queryClient = useQueryClient();
	const [isWriteModalOpen, setIsWriteModalOpen] = useState(false);
	const [slotBank, setSlotBank] = useState<"internal" | "cartridge">(
		"internal",
	);
	const [formData, setFormData] = useState<PresetFormData>({
		name: "",
		filename: "",
		tags: "",
		description: "",
		author: "",
		createdDate: "",
		modifiedDate: "",
	});

	useEffect(() => {
		if (!currentPreset) return;

		setFormData({
			name: currentPreset.name,
			filename: currentPreset.filename,
			tags: currentPreset.tags.join(","),
			description: currentPreset.description || "",
			author: currentPreset.author || "",
			createdDate: currentPreset.createdDate,
			modifiedDate: currentPreset.modifiedDate,
		});
	}, [currentPreset]);

	const handleInputChange = (
		e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
	) => {
		const { id, value } = e.target;
		setFormData((prevData) => ({ ...prevData, [id]: value }));
	};

	const handleSave = async () => {
		if (!currentPreset) return;

		const updatedPreset = {
			...currentPreset,
			...formData,
			tags: formData.tags
				.split(",")
				.map((tag) => tag.trim())
				.filter(Boolean),
		};

		await updatePreset(updatedPreset);
		await queryClient.invalidateQueries({ queryKey: ["presets"] });
		onPresetUpdated(updatedPreset);
		setEditMode(false);
	};

	const handleCancel = () => {
		if (currentPreset) {
			setFormData({
				name: currentPreset.name,
				filename: currentPreset.filename,
				tags: currentPreset.tags.join(","),
				description: currentPreset.description || "",
				author: currentPreset.author || "",
				createdDate: currentPreset.createdDate,
				modifiedDate: currentPreset.modifiedDate,
			});
		}

		setEditMode(false);
	};

	return (
		<div
			className={
				"w-72 lg:w-md flex flex-col p-4 bg-base-200 h-full overflow-auto min-w-52 lg:min-w-72" +
				(currentPreset ? " block" : " hidden")
			}
		>
			<div className="flex flex-col grow gap-2">
				<div className="p-2 border rounded-lg border-base-content/10 bg-base-100/20">
					<div className="flex items-center justify-between gap-2 mb-2">
						<div className="text-xs font-bold tracking-wider uppercase text-base-content/60">
							Preset Details
						</div>
						<div className="flex gap-2">
							{editMode ? (
								<>
									<Button onClick={handleSave} variant="success" size="sm">
										Save
									</Button>
									<Button onClick={handleCancel} variant="error" size="sm">
										Cancel
									</Button>
								</>
							) : (
								<>
									<Button
										variant="primary"
										onClick={() => setEditMode(true)}
										size="sm"
									>
										Edit
									</Button>
									<Button
										variant="error"
										onClick={() => setShowDeleteModal(true)}
										size="sm"
									>
										Delete
									</Button>
								</>
							)}
						</div>
					</div>
					<div className="space-y-3">
						<div className="p-2 border rounded-md border-base-content/10 bg-base-200/30">
							<Button
								variant="info"
								size="sm"
								className="w-full"
								onClick={() => setIsWriteModalOpen(true)}
								disabled={!currentPreset}
								title={
									currentPreset
										? "Write selected preset to synth slot"
										: "Select a preset to enable slot write"
								}
							>
								Write current preset to slot
							</Button>
						</div>

						<div className="p-2 border rounded-md border-base-content/10 bg-base-200/30">
							<FormField
								label="Name"
								labelClassName="text-[10px] uppercase tracking-wider text-base-content/40"
							>
								{editMode ? (
									<TextInput
										type="text"
										id="name"
										value={formData.name}
										onChange={handleInputChange}
										placeholder="Name"
										inputSize="sm"
									/>
								) : (
									<div className="mt-1 text-lg font-bold leading-tight wrap-break-word">
										{formData.name || "-"}
									</div>
								)}
							</FormField>
						</div>

						<div className="p-2 border rounded-md border-base-content/10 bg-base-200/30">
							<FormField
								label="Tags"
								labelClassName="text-[10px] uppercase tracking-wider text-base-content/40"
							>
								{editMode ? (
									<TextInput
										type="text"
										id="tags"
										value={formData.tags}
										onChange={handleInputChange}
										placeholder="tag1, tag2"
										inputSize="sm"
									/>
								) : (
									<div className="flex flex-wrap gap-1 mt-1">
										{currentPreset?.tags.length ? (
											currentPreset.tags.map((tag: string) => (
												<span
													key={uuidv4()}
													className="capitalize badge badge-primary badge-sm"
												>
													{tag.toLowerCase()}
												</span>
											))
										) : (
											<span className="text-xs opacity-50">No tags</span>
										)}
									</div>
								)}
							</FormField>
						</div>

						<div className="grid grid-cols-1 gap-2">
							<div className="p-2 border rounded-md border-base-content/10 bg-base-200/30">
								<FormField
									label="Author"
									labelClassName="text-[10px] uppercase tracking-wider text-base-content/40"
								>
									{editMode ? (
										<TextInput
											type="text"
											id="author"
											value={formData.author}
											onChange={handleInputChange}
											placeholder="Author"
											inputSize="sm"
										/>
									) : (
										<div className="mt-1 text-xs font-semibold wrap-break-word">
											{formData.author || "-"}
										</div>
									)}
								</FormField>
							</div>
						</div>

						<div className="p-2 border rounded-md border-base-content/10 bg-base-200/30">
							<FormField
								label="Description"
								labelClassName="text-[10px] uppercase tracking-wider text-base-content/40"
							>
								{editMode ? (
									<TextAreaInput
										id="description"
										value={formData.description}
										onChange={handleInputChange}
										placeholder="Description"
										size="sm"
										rows={4}
									/>
								) : (
									<div className="mt-1 text-xs font-semibold whitespace-pre-wrap wrap-break-word">
										{formData.description || "-"}
									</div>
								)}
							</FormField>
						</div>

						<details className="p-2 border rounded-md border-base-content/10 bg-base-200/30">
							<summary className="text-[10px] font-bold uppercase tracking-wider cursor-pointer text-base-content/60">
								Additional Data
							</summary>
							<div className="grid grid-cols-1 gap-2 mt-2">
								<KeyValueBlock label="ID" value={currentPreset?.id || "-"} />
								<KeyValueBlock
									label="Filename"
									value={formData.filename || "-"}
								/>
								<KeyValueBlock
									label="Created"
									value={formData.createdDate || "-"}
								/>
								<KeyValueBlock
									label="Modified"
									value={formData.modifiedDate || "-"}
								/>
							</div>
						</details>

						<details className="p-2 border rounded-md border-base-content/10 bg-base-200/30">
							<summary className="text-[10px] font-bold uppercase tracking-wider cursor-pointer text-base-content/60">
								Raw SysEx Data
							</summary>
							<div className="mt-2 max-h-40 overflow-auto text-[10px] font-mono font-semibold whitespace-pre-wrap break-all opacity-80">
								{buf2hex(currentPreset?.sysexData || [])}
							</div>
						</details>
					</div>
				</div>
				{currentPreset?.sysexData && (
					<div className="p-2 border rounded-lg border-base-content/10 bg-base-100/20">
						<div className="mb-2 text-xs font-bold tracking-wider uppercase text-base-content/60">
							Patch Parameters
						</div>
						<PatchParameterViewer sysexData={currentPreset.sysexData} />
					</div>
				)}
			</div>

			{isWriteModalOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
					<div className="rounded-xl bg-base-100 p-4 shadow-lg">
						<h2 className="mb-4 text-xl">Write current preset to slot</h2>
						<div className="mb-4">
							<div className="label">
								<span className="label-text">Bank</span>
							</div>
							<SelectInput
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
							{Array.from({ length: 16 }, (_, i) => i + 1).map((slot) => (
								<Button
									key={`details-write-slot-${slot}`}
									onClick={() => {
										onWritePresetSlot(slotBank, slot);
										setIsWriteModalOpen(false);
									}}
									variant="primary"
									className="text-2xl font-bold"
								>
									{slot}
								</Button>
							))}
						</div>
						<Button
							onClick={() => setIsWriteModalOpen(false)}
							variant="error"
							className="mt-4"
						>
							Close
						</Button>
					</div>
				</div>
			)}
		</div>
	);
};

export default PresetDetails;
