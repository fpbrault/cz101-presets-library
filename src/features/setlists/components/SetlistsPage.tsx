import React, { useMemo, useState } from 'react'
import InlineNotice from '@/components/InlineNotice'
import SetlistsSidebar from '@/features/setlists/components/SetlistsSidebar'
import SetlistDetailsHeader from '@/features/setlists/components/SetlistDetailsHeader'
import SetlistEntriesTable from '@/features/setlists/components/SetlistEntriesTable'
import SendEntryModal from '@/features/setlists/components/SendEntryModal'
import {
  SendModalState,
  SetlistsPageProps,
} from '@/features/setlists/components/SetlistsPage.types'

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
  const [sendModalState, setSendModalState] = useState<SendModalState | null>(
    null,
  )
  const [restoreBank, setRestoreBank] = useState<'internal' | 'cartridge'>(
    'internal',
  )
  const selectedSetlist = useMemo(
    () => setlists.find((setlist) => setlist.id === selectedSetlistId) ?? null,
    [setlists, selectedSetlistId],
  )

  return (
    <div className="flex flex-grow h-full overflow-hidden bg-base-300">
      <SetlistsSidebar
        setlists={setlists}
        selectedSetlistId={selectedSetlistId}
        isBackingUp={isBackingUp}
        backupProgress={backupProgress}
        restoreProgress={restoreProgress}
        onSelectSetlist={onSelectSetlist}
        onCreateBackup={onCreateBackup}
        onImportSetlist={onImportSetlist}
      />

      <section className="flex flex-col flex-grow h-full overflow-hidden">
        {!selectedSetlist && (
          <div className="flex items-center justify-center flex-grow px-4">
            <InlineNotice
              message="Select a setlist to view backup entries."
              tone="neutral"
              size="md"
              className="max-w-md"
            />
          </div>
        )}

        {selectedSetlist && (
          <>
            <SetlistDetailsHeader
              selectedSetlist={selectedSetlist}
              restoreBank={restoreBank}
              isRestoring={isRestoring}
              onRestoreBankChange={setRestoreBank}
              onRestoreSetlistToSynth={onRestoreSetlistToSynth}
              onExportSetlist={onExportSetlist}
              onDeleteSetlist={onDeleteSetlist}
            />

            <SetlistEntriesTable
              selectedSetlist={selectedSetlist}
              onPreviewEntryInBuffer={onPreviewEntryInBuffer}
              onSaveEntryAsPreset={onSaveEntryAsPreset}
              onOpenSendModal={(entryIndex, slot) =>
                setSendModalState({
                  entryIndex,
                  bank: 'internal',
                  slot,
                })
              }
            />
          </>
        )}
      </section>

      {selectedSetlist && sendModalState && (
        <SendEntryModal
          selectedSetlist={selectedSetlist}
          sendModalState={sendModalState}
          setSendModalState={setSendModalState}
          onSendEntryToSlot={onSendEntryToSlot}
        />
      )}
    </div>
  )
}

export default SetlistsPage
