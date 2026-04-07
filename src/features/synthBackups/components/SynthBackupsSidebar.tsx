import InlineNotice from "@/components/feedback/InlineNotice";
import FileInput from "@/components/forms/FileInput";
import Button from "@/components/ui/Button";
import type { SynthBackup } from "@/lib/collections/synthBackupManager";

interface SynthBackupsSidebarProps {
	backups: SynthBackup[];
	selectedBackupId: string | null;
	isBackingUp: boolean;
	backupProgress: { completed: number; total: number } | null;
	restoreProgress: {
		completed: number;
		total: number;
		attempts: number;
	} | null;
	onSelectBackup: (backupId: string) => void;
	onCreateBackup: () => void;
	onImportBackup: (file: File) => void;
}

export default function SynthBackupsSidebar({
	backups,
	selectedBackupId,
	isBackingUp,
	backupProgress,
	restoreProgress,
	onSelectBackup,
	onCreateBackup,
	onImportBackup,
}: SynthBackupsSidebarProps) {
	return (
		<aside className="w-[24rem] min-w-[20rem] border-r border-base-content/10 bg-base-200/70 overflow-auto p-4">
			<div className="flex flex-col gap-2 mb-4">
				<Button
					variant="accent"
					onClick={onCreateBackup}
					disabled={isBackingUp}
				>
					{isBackingUp ? "Backing Up..." : "New Backup (16 Slots)"}
				</Button>
				<div className="w-full form-control">
					<FileInput
						aria-label="Import synth backup JSON"
						accept="application/json"
						inputSize="sm"
						onChange={(event) => {
							const file = event.target.files?.[0];
							if (file) {
								onImportBackup(file);
								event.target.value = "";
							}
						}}
					/>
				</div>
				{backupProgress && (
					<div className="text-xs opacity-80">
						Backup Progress: {backupProgress.completed}/{backupProgress.total}
					</div>
				)}
				{restoreProgress && (
					<div className="text-xs opacity-80">
						Restore Progress: {restoreProgress.completed}/
						{restoreProgress.total} | Attempts: {restoreProgress.attempts}
					</div>
				)}
			</div>

			<div className="space-y-2">
				{backups.length === 0 && (
					<InlineNotice
						message="No synth backups yet. Create a backup or import a JSON backup."
						tone="neutral"
					/>
				)}
				{backups.map((backup) => (
					<button
						type="button"
						key={backup.id}
						className={
							"w-full text-left p-3 rounded-lg border transition-colors " +
							(selectedBackupId === backup.id
								? "bg-base-100 border-primary/60"
								: "bg-base-200 border-base-content/10 hover:bg-base-100/60")
						}
						onClick={() => onSelectBackup(backup.id)}
					>
						<div className="text-sm font-bold truncate">{backup.name}</div>
						<div className="text-xs opacity-70">
							{new Date(backup.createdAt).toLocaleString()} •{" "}
							{backup.entries.length} entries
						</div>
					</button>
				))}
			</div>
		</aside>
	);
}
