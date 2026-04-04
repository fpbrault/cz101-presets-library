import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import SetlistsPage from '@/features/setlists/components/SetlistsPage'
import { renderWithProviders } from '@/test/renderWithProviders'

describe('SetlistsPage (user playlists)', () => {
  it('shows a notice when no playlist is selected', () => {
    renderWithProviders(
      <SetlistsPage
        playlists={[]}
        selectedPlaylistId={null}
        presets={[]}
        quickSendIndex={null}
        isQuickSending={false}
        onSelectPlaylist={vi.fn()}
        onCreatePlaylist={vi.fn()}
        onRenamePlaylist={vi.fn()}
        onDeletePlaylist={vi.fn()}
        onAddPreset={vi.fn()}
        onRemoveEntry={vi.fn()}
        onReorderEntries={vi.fn()}
        onStartQuickSend={vi.fn()}
        onStepQuickSend={vi.fn()}
        onStopQuickSend={vi.fn()}
        onSendCurrentToBuffer={vi.fn()}
      />,
    )

    expect(screen.getByText('Select a setlist or create a new one.')).toBeTruthy()
  })
})
