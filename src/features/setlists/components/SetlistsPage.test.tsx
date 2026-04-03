import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import SetlistsPage from '@/features/setlists/components/SetlistsPage'
import { renderWithProviders } from '@/test/renderWithProviders'

describe('SetlistsPage', () => {
  it('shows a notice when no setlist is selected', () => {
    renderWithProviders(
      <SetlistsPage
        setlists={[]}
        selectedSetlistId={null}
        isBackingUp={false}
        backupProgress={null}
        isRestoring={false}
        restoreProgress={null}
        onSelectSetlist={vi.fn()}
        onCreateBackup={vi.fn()}
        onRestoreSetlistToSynth={vi.fn()}
        onDeleteSetlist={vi.fn()}
        onExportSetlist={vi.fn()}
        onImportSetlist={vi.fn()}
        onSaveEntryAsPreset={vi.fn()}
        onSendEntryToSlot={vi.fn()}
        onPreviewEntryInBuffer={vi.fn()}
      />,
    )

    expect(
      screen.getByText('Select a setlist to view backup entries.'),
    ).toBeTruthy()
  })
})