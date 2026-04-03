import Button from '@/components/Button'
import { Setlist } from '@/lib/setlistManager'

interface SetlistDetailsHeaderProps {
  selectedSetlist: Setlist
  restoreBank: 'internal' | 'cartridge'
  isRestoring: boolean
  onRestoreBankChange: (bank: 'internal' | 'cartridge') => void
  onRestoreSetlistToSynth: (setlistId: string, bank: 'internal' | 'cartridge') => void
  onExportSetlist: (setlistId: string) => void
  onDeleteSetlist: (setlistId: string) => void
}

export default function SetlistDetailsHeader({
  selectedSetlist,
  restoreBank,
  isRestoring,
  onRestoreBankChange,
  onRestoreSetlistToSynth,
  onExportSetlist,
  onDeleteSetlist,
}: SetlistDetailsHeaderProps) {
  return (
    <div className="flex items-center justify-between p-4 border-b border-base-content/10 bg-base-200/50">
      <div>
        <div className="text-lg font-bold">{selectedSetlist.name}</div>
        <div className="text-xs opacity-70">
          {new Date(selectedSetlist.createdAt).toLocaleString()} •{' '}
          {selectedSetlist.entries.length} slots
        </div>
      </div>
      <div className="flex gap-2">
        <select
          className="select select-bordered select-sm"
          value={restoreBank}
          onChange={(event) =>
            onRestoreBankChange(event.target.value as 'internal' | 'cartridge')
          }
        >
          <option value="internal">Restore to Internal</option>
          <option value="cartridge">Restore to Cartridge</option>
        </select>
        <Button
          variant="accent"
          size="sm"
          disabled={isRestoring}
          onClick={() => onRestoreSetlistToSynth(selectedSetlist.id, restoreBank)}
        >
          {isRestoring ? 'Restoring...' : 'Restore To Synth'}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onExportSetlist(selectedSetlist.id)}
        >
          Export JSON
        </Button>
        <Button
          variant="error"
          size="sm"
          onClick={() => onDeleteSetlist(selectedSetlist.id)}
        >
          Delete
        </Button>
      </div>
    </div>
  )
}
