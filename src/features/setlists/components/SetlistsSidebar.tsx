import Button from '@/components/Button'
import FileInput from '@/components/FileInput'
import InlineNotice from '@/components/InlineNotice'
import { Setlist } from '@/lib/setlistManager'

interface SetlistsSidebarProps {
  setlists: Setlist[]
  selectedSetlistId: string | null
  isBackingUp: boolean
  backupProgress: { completed: number; total: number } | null
  restoreProgress: { completed: number; total: number; attempts: number } | null
  onSelectSetlist: (setlistId: string) => void
  onCreateBackup: () => void
  onImportSetlist: (file: File) => void
}

export default function SetlistsSidebar({
  setlists,
  selectedSetlistId,
  isBackingUp,
  backupProgress,
  restoreProgress,
  onSelectSetlist,
  onCreateBackup,
  onImportSetlist,
}: SetlistsSidebarProps) {
  return (
    <aside className="w-[24rem] min-w-[20rem] border-r border-base-content/10 bg-base-200/70 overflow-auto p-4">
      <div className="flex flex-col gap-2 mb-4">
        <Button variant="accent" onClick={onCreateBackup} disabled={isBackingUp}>
          {isBackingUp ? 'Backing Up...' : 'New Backup (16 Slots)'}
        </Button>
        <label className="w-full form-control">
          <FileInput
            accept="application/json"
            inputSize="sm"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) {
                onImportSetlist(file)
                event.target.value = ''
              }
            }}
          />
        </label>
        {backupProgress && (
          <div className="text-xs opacity-80">
            Backup Progress: {backupProgress.completed}/{backupProgress.total}
          </div>
        )}
        {restoreProgress && (
          <div className="text-xs opacity-80">
            Restore Progress: {restoreProgress.completed}/{restoreProgress.total} |
            Attempts: {restoreProgress.attempts}
          </div>
        )}
      </div>

      <div className="space-y-2">
        {setlists.length === 0 && (
          <InlineNotice
            message="No setlists yet. Create a backup or import a JSON setlist."
            tone="neutral"
          />
        )}
        {setlists.map((setlist) => (
          <button
            key={setlist.id}
            className={
              'w-full text-left p-3 rounded-lg border transition-colors ' +
              (selectedSetlistId === setlist.id
                ? 'bg-base-100 border-primary/60'
                : 'bg-base-200 border-base-content/10 hover:bg-base-100/60')
            }
            onClick={() => onSelectSetlist(setlist.id)}
          >
            <div className="text-sm font-bold truncate">{setlist.name}</div>
            <div className="text-xs opacity-70">
              {new Date(setlist.createdAt).toLocaleString()} • {setlist.entries.length}{' '}
              entries
            </div>
          </button>
        ))}
      </div>
    </aside>
  )
}
