import Button from '@/components/Button'
import { Setlist } from '@/lib/setlistManager'

interface SetlistEntriesTableProps {
  selectedSetlist: Setlist
  onPreviewEntryInBuffer: (setlistId: string, entryIndex: number) => void
  onSaveEntryAsPreset: (setlistId: string, entryIndex: number) => void
  onOpenSendModal: (entryIndex: number, slot: number) => void
}

export default function SetlistEntriesTable({
  selectedSetlist,
  onPreviewEntryInBuffer,
  onSaveEntryAsPreset,
  onOpenSendModal,
}: SetlistEntriesTableProps) {
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
          {selectedSetlist.entries.map((entry, entryIndex) => (
            <tr key={`${selectedSetlist.id}-${entry.slot}-${entryIndex}`}>
              <td>{entry.slot}</td>
              <td>
                {entry.isExactLibraryMatch ? (
                  <span className="badge badge-success">Exact Match</span>
                ) : (
                  <span className="badge badge-ghost">No Match</span>
                )}
              </td>
              <td>{entry.matchedPresetName || '-'}</td>
              <td>{entry.matchedPresetAuthor || '-'}</td>
              <td>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      onPreviewEntryInBuffer(selectedSetlist.id, entryIndex)
                    }
                  >
                    Preview Temp
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => onSaveEntryAsPreset(selectedSetlist.id, entryIndex)}
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
  )
}
