import React, { useMemo, useState } from 'react'
import Button from '@/components/Button'
import { Setlist } from '@/lib/setlistManager'

interface SetlistsPageProps {
  setlists: Setlist[]
  selectedSetlistId: string | null
  isBackingUp: boolean
  backupProgress: { completed: number; total: number } | null
  isRestoring: boolean
  restoreProgress: { completed: number; total: number; attempts: number } | null
  onSelectSetlist: (setlistId: string) => void
  onCreateBackup: () => void
  onRestoreSetlistToSynth: (
    setlistId: string,
    bank: 'internal' | 'cartridge',
  ) => void
  onDeleteSetlist: (setlistId: string) => void
  onExportSetlist: (setlistId: string) => void
  onImportSetlist: (file: File) => void
  onSaveEntryAsPreset: (setlistId: string, entryIndex: number) => void
  onSendEntryToSlot: (
    setlistId: string,
    entryIndex: number,
    bank: 'internal' | 'cartridge',
    slot: number,
  ) => void
  onPreviewEntryInBuffer: (setlistId: string, entryIndex: number) => void
}

const SetlistsPage: React.FC<SetlistsPageProps> = ({
  setlists,
  selectedSetlistId,
  isBackingUp,
  backupProgress,
  isRestoring,
  restoreProgress,
  onSelectSetlist,
  onCreateBackup,
  onRestoreSetlistToSynth,
  onDeleteSetlist,
  onExportSetlist,
  onImportSetlist,
  onSaveEntryAsPreset,
  onSendEntryToSlot,
  onPreviewEntryInBuffer,
}) => {
  const [sendModalState, setSendModalState] = useState<{
    entryIndex: number
    bank: 'internal' | 'cartridge'
    slot: number
  } | null>(null)
  const [restoreBank, setRestoreBank] = useState<'internal' | 'cartridge'>(
    'internal',
  )
  const selectedSetlist = useMemo(
    () => setlists.find((setlist) => setlist.id === selectedSetlistId) ?? null,
    [setlists, selectedSetlistId],
  )

  return (
    <div className="flex flex-grow h-full overflow-hidden bg-base-300">
      <aside className="w-[24rem] min-w-[20rem] border-r border-base-content/10 bg-base-200/70 overflow-auto p-4">
        <div className="flex flex-col gap-2 mb-4">
          <Button variant="accent" onClick={onCreateBackup} disabled={isBackingUp}>
            {isBackingUp ? 'Backing Up...' : 'New Backup (16 Slots)'}
          </Button>
          <label className="w-full form-control">
            <input
              type="file"
              accept="application/json"
              className="w-full file-input file-input-bordered file-input-sm"
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
              Restore Progress: {restoreProgress.completed}/{restoreProgress.total} | Attempts: {restoreProgress.attempts}
            </div>
          )}
        </div>

        <div className="space-y-2">
          {setlists.length === 0 && (
            <div className="text-sm opacity-60">No setlists yet.</div>
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
                {new Date(setlist.createdAt).toLocaleString()} • {setlist.entries.length} entries
              </div>
            </button>
          ))}
        </div>
      </aside>

      <section className="flex flex-col flex-grow h-full overflow-hidden">
        {!selectedSetlist && (
          <div className="flex items-center justify-center flex-grow text-base-content/60">
            Select a setlist to view backup entries.
          </div>
        )}

        {selectedSetlist && (
          <>
            <div className="flex items-center justify-between p-4 border-b border-base-content/10 bg-base-200/50">
              <div>
                <div className="text-lg font-bold">{selectedSetlist.name}</div>
                <div className="text-xs opacity-70">
                  {new Date(selectedSetlist.createdAt).toLocaleString()} • {selectedSetlist.entries.length} slots
                </div>
              </div>
              <div className="flex gap-2">
                <select
                  className="select select-bordered select-sm"
                  value={restoreBank}
                  onChange={(event) =>
                    setRestoreBank(event.target.value as 'internal' | 'cartridge')
                  }
                >
                  <option value="internal">Restore to Internal</option>
                  <option value="cartridge">Restore to Cartridge</option>
                </select>
                <Button
                  variant="accent"
                  size="sm"
                  disabled={isRestoring}
                  onClick={() =>
                    onRestoreSetlistToSynth(selectedSetlist.id, restoreBank)
                  }
                >
                  {isRestoring ? 'Restoring...' : 'Restore To Synth'}
                </Button>
                <Button variant="secondary" size="sm" onClick={() => onExportSetlist(selectedSetlist.id)}>
                  Export JSON
                </Button>
                <Button variant="error" size="sm" onClick={() => onDeleteSetlist(selectedSetlist.id)}>
                  Delete
                </Button>
              </div>
            </div>

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
                            onClick={() =>
                              onSaveEntryAsPreset(selectedSetlist.id, entryIndex)
                            }
                          >
                            Save As Preset
                          </Button>
                          <Button
                            variant="info"
                            size="sm"
                            onClick={() =>
                              setSendModalState({
                                entryIndex,
                                bank: 'internal',
                                slot: entry.slot,
                              })
                            }
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
          </>
        )}
      </section>

      {selectedSetlist && sendModalState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="p-4 shadow-lg bg-base-100 rounded-xl w-[24rem]">
            <h2 className="mb-4 text-xl">Send Entry To Slot</h2>
            <div className="flex flex-col gap-3">
              <label className="form-control">
                <span className="label-text">Bank</span>
                <select
                  className="select select-bordered"
                  value={sendModalState.bank}
                  onChange={(event) =>
                    setSendModalState({
                      ...sendModalState,
                      bank: event.target.value as 'internal' | 'cartridge',
                    })
                  }
                >
                  <option value="internal">Internal</option>
                  <option value="cartridge">Cartridge</option>
                </select>
              </label>

              <label className="form-control">
                <span className="label-text">Slot</span>
                <select
                  className="select select-bordered"
                  value={sendModalState.slot}
                  onChange={(event) =>
                    setSendModalState({
                      ...sendModalState,
                      slot: Number(event.target.value),
                    })
                  }
                >
                  {Array.from({ length: 16 }, (_, index) => (
                    <option key={index + 1} value={index + 1}>
                      {index + 1}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <Button variant="secondary" onClick={() => setSendModalState(null)}>
                Cancel
              </Button>
              <Button
                variant="info"
                onClick={() => {
                  onSendEntryToSlot(
                    selectedSetlist.id,
                    sendModalState.entryIndex,
                    sendModalState.bank,
                    sendModalState.slot,
                  )
                  setSendModalState(null)
                }}
              >
                Send
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SetlistsPage
