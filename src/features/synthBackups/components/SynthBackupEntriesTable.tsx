import Button from "@/components/ui/Button";
import type { SynthBackup } from "@/lib/collections/synthBackupManager";

interface SynthBackupEntriesTableProps {
	selectedBackup: SynthBackup;
	onPreviewEntryInBuffer: (backupId: string, entryIndex: number) => void;
	onSaveEntryAsPreset: (backupId: string, entryIndex: number) => void;
	onOpenSendModal: (entryIndex: number, slot: number) => void;
}

export default function SynthBackupEntriesTable({
	selectedBackup,
	onPreviewEntryInBuffer,
	onSaveEntryAsPreset,
	onOpenSendModal,
}: SynthBackupEntriesTableProps) {
	return (
		<div className="flex-grow overflow-auto">
			<table className="table table-sm table-zebra">
				<thead>
					<tr>
						<th>Slot</th>
						<th>Match</th>
						<th>Library Preset</th>
						<th>Author</th>
						<th>Action</th>
					</tr>
				</thead>
				<tbody>
					{selectedBackup.entries.map((entry, entryIndex) => (
						<tr key={`${selectedBackup.id}-${entry.slot}`}>
							<td>{entry.slot}</td>
							<td>
								{entry.isExactLibraryMatch ? (
									<span className="badge badge-success">Exact Match</span>
								) : (
									<span className="badge badge-ghost">No Match</span>
								)}
							</td>
							<td>{entry.matchedPresetName || "-"}</td>
							<td>{entry.matchedPresetAuthor || "-"}</td>
							<td>
								<div className="flex gap-2">
									<Button
										variant="secondary"
										size="sm"
										onClick={() =>
											onPreviewEntryInBuffer(selectedBackup.id, entryIndex)
										}
									>
										Preview Temp
									</Button>
									<Button
										variant="primary"
										size="sm"
										onClick={() =>
											onSaveEntryAsPreset(selectedBackup.id, entryIndex)
										}
									>
										Save As Preset
									</Button>
									<Button
										variant="info"
										size="sm"
										onClick={() => onOpenSendModal(entryIndex, entry.slot)}
									>
										Send To Slot
									</Button>
								</div>
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
