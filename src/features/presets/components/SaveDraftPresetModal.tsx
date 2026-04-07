import FormField from "@/components/forms/FormField";
import TextAreaInput from "@/components/forms/TextAreaInput";
import TextInput from "@/components/forms/TextInput";
import Button from "@/components/ui/Button";
import ModalShell from "@/components/ui/ModalShell";

interface SaveDraftPresetModalProps {
	isOpen: boolean;
	matchingPresetName?: string;
	name: string;
	author: string;
	tags: string;
	description: string;
	onNameChange: (value: string) => void;
	onAuthorChange: (value: string) => void;
	onTagsChange: (value: string) => void;
	onDescriptionChange: (value: string) => void;
	onCancel: () => void;
	onSave: () => void;
}

export default function SaveDraftPresetModal({
	isOpen,
	matchingPresetName,
	name,
	author,
	tags,
	description,
	onNameChange,
	onAuthorChange,
	onTagsChange,
	onDescriptionChange,
	onCancel,
	onSave,
}: SaveDraftPresetModalProps) {
	if (!isOpen) {
		return null;
	}

	return (
		<ModalShell panelClassName="w-full max-w-2xl" onClose={onCancel}>
			<h2 className="mb-3 text-xl font-bold">Save Retrieved Preset</h2>

			{matchingPresetName && (
				<div className="p-2 mb-3 text-sm rounded-md bg-success/20 border border-success/40">
					Exact library match found: {matchingPresetName}
				</div>
			)}

			<div className="grid grid-cols-1 gap-3">
				<FormField label="Name">
					<TextInput
						value={name}
						onChange={(e) => onNameChange(e.target.value)}
					/>
				</FormField>

				<FormField label="Author">
					<TextInput
						value={author}
						onChange={(e) => onAuthorChange(e.target.value)}
					/>
				</FormField>

				<FormField label="Tags (comma-separated)">
					<TextInput
						value={tags}
						onChange={(e) => onTagsChange(e.target.value)}
					/>
				</FormField>

				<FormField label="Description">
					<TextAreaInput
						value={description}
						onChange={(e) => onDescriptionChange(e.target.value)}
					/>
				</FormField>
			</div>

			<div className="flex justify-end gap-2 mt-4">
				<Button variant="secondary" onClick={onCancel}>
					Cancel
				</Button>
				<Button variant="primary" onClick={onSave}>
					Save New Preset
				</Button>
			</div>
		</ModalShell>
	);
}
