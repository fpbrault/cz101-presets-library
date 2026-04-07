import { useMemo, useState } from "react";
import SelectInput from "@/components/forms/SelectInput";
import TextInput from "@/components/forms/TextInput";
import Button from "@/components/ui/Button";
import ModalShell from "@/components/ui/ModalShell";

interface TagManagerModalProps {
	isOpen: boolean;
	availableTags: [string, number][];
	onClose: () => void;
	onRenameOrMerge: (sourceTag: string, targetTag: string) => Promise<void>;
	onDeleteTag: (tag: string) => Promise<void>;
}

export default function TagManagerModal({
	isOpen,
	availableTags,
	onClose,
	onRenameOrMerge,
	onDeleteTag,
}: TagManagerModalProps) {
	const [sourceTag, setSourceTag] = useState("");
	const [targetTag, setTargetTag] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);

	const hasTags = availableTags.length > 0;

	const actionLabel = useMemo(() => {
		if (!sourceTag || !targetTag) {
			return "Rename/Merge";
		}
		return sourceTag === targetTag
			? "Rename/Merge"
			: "Rename/Merge into target";
	}, [sourceTag, targetTag]);

	if (!isOpen) {
		return null;
	}

	return (
		<ModalShell panelClassName="w-full max-w-lg" onClose={onClose}>
			<h2 className="mb-4 text-xl font-bold">Tag Management</h2>

			{!hasTags && (
				<p className="mb-4 text-sm opacity-70">No tags to manage.</p>
			)}

			{hasTags && (
				<div className="grid grid-cols-1 gap-3">
					<label className="form-control">
						<span className="label-text">Source tag</span>
						<SelectInput
							value={sourceTag}
							onChange={(e) => {
								setSourceTag(e.target.value);
								if (!targetTag) {
									setTargetTag(e.target.value);
								}
							}}
						>
							<option value="">Select tag</option>
							{availableTags.map(([tag, count]) => (
								<option key={tag} value={tag}>
									{tag} ({count})
								</option>
							))}
						</SelectInput>
					</label>

					<label className="form-control">
						<span className="label-text">Target tag (for rename/merge)</span>
						<TextInput
							value={targetTag}
							placeholder="e.g. bass"
							onChange={(e) => setTargetTag(e.target.value.toLowerCase())}
						/>
					</label>
				</div>
			)}

			<div className="flex flex-wrap justify-end gap-2 mt-6">
				<Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
					Close
				</Button>
				<Button
					variant="error"
					disabled={!sourceTag || isSubmitting}
					onClick={async () => {
						setIsSubmitting(true);
						try {
							await onDeleteTag(sourceTag);
							setSourceTag("");
							setTargetTag("");
						} finally {
							setIsSubmitting(false);
						}
					}}
				>
					Delete Tag
				</Button>
				<Button
					variant="primary"
					disabled={!sourceTag || !targetTag.trim() || isSubmitting}
					onClick={async () => {
						setIsSubmitting(true);
						try {
							await onRenameOrMerge(sourceTag, targetTag);
							setSourceTag("");
							setTargetTag("");
						} finally {
							setIsSubmitting(false);
						}
					}}
				>
					{actionLabel}
				</Button>
			</div>
		</ModalShell>
	);
}
