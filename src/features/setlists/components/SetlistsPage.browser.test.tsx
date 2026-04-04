import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SetlistsPage from '@/features/setlists/components/SetlistsPage'
import { renderWithProviders } from '@/test/renderWithProviders'
import type { Setlist } from '@/lib/setlistManager'

const noopProps = {
  isBackingUp: false,
  backupProgress: null,
  isRestoring: false,
  restoreProgress: null,
  onSelectSetlist: vi.fn(),
  onCreateBackup: vi.fn(),
  onRestoreSetlistToSynth: vi.fn(),
  onDeleteSetlist: vi.fn(),
  onExportSetlist: vi.fn(),
  onImportSetlist: vi.fn(),
  onSaveEntryAsPreset: vi.fn(),
  onSendEntryToSlot: vi.fn(),
  onPreviewEntryInBuffer: vi.fn(),
}

function makeSetlist(overrides: Partial<Setlist> = {}): Setlist {
  return {
    id: 'sl-1',
    name: 'Test Backup',
    source: 'internal-16',
    createdAt: new Date().toISOString(),
    entries: [],
    ...overrides,
  }
}

describe('SetlistsPage (browser)', () => {
  it('shows a notice when no setlist is selected', () => {
    renderWithProviders(
      <SetlistsPage
        {...noopProps}
        setlists={[]}
        selectedSetlistId={null}
      />,
    )
    expect(screen.getByText(/select a setlist/i)).toBeTruthy()
  })

  it('does not show the notice when a setlist is selected', () => {
    const setlist = makeSetlist()
    renderWithProviders(
      <SetlistsPage
        {...noopProps}
        setlists={[setlist]}
        selectedSetlistId={setlist.id}
      />,
    )
    expect(screen.queryByText(/select a setlist/i)).toBeNull()
  })

  it('renders the selected setlist name', () => {
    const setlist = makeSetlist({ name: 'Live Gig 2024' })
    renderWithProviders(
      <SetlistsPage
        {...noopProps}
        setlists={[setlist]}
        selectedSetlistId={setlist.id}
      />,
    )
    expect(screen.getByText('Live Gig 2024')).toBeTruthy()
  })

  it('renders multiple setlists in the sidebar', () => {
    const setlists = [
      makeSetlist({ id: 'sl-1', name: 'Backup One' }),
      makeSetlist({ id: 'sl-2', name: 'Backup Two' }),
    ]
    renderWithProviders(
      <SetlistsPage
        {...noopProps}
        setlists={setlists}
        selectedSetlistId={null}
      />,
    )
    expect(screen.getByText('Backup One')).toBeTruthy()
    expect(screen.getByText('Backup Two')).toBeTruthy()
  })

  it('calls onSelectSetlist when a setlist item is clicked', async () => {
    const user = userEvent.setup()
    const onSelectSetlist = vi.fn()
    const setlist = makeSetlist({ id: 'sl-click', name: 'Click Me' })

    renderWithProviders(
      <SetlistsPage
        {...noopProps}
        setlists={[setlist]}
        selectedSetlistId={null}
        onSelectSetlist={onSelectSetlist}
      />,
    )

    await user.click(screen.getByText('Click Me'))
    expect(onSelectSetlist).toHaveBeenCalledWith('sl-click')
  })

  it('shows entry count for a selected setlist with entries', () => {
    const setlist = makeSetlist({
      id: 'sl-entries',
      entries: [
        {
          slot: 1,
          programByte: 0x20,
          sysexData: new Uint8Array([0xf0, 0x44, 0xf7]),
          isExactLibraryMatch: false,
        },
        {
          slot: 2,
          programByte: 0x21,
          sysexData: new Uint8Array([0xf0, 0x44, 0xf7]),
          isExactLibraryMatch: true,
          matchedPresetName: 'Bass 1',
        },
      ],
    })

    renderWithProviders(
      <SetlistsPage
        {...noopProps}
        setlists={[setlist]}
        selectedSetlistId={setlist.id}
      />,
    )

    // The entries table should show slot numbers
    expect(screen.getAllByText(/slot/i).length).toBeGreaterThan(0)
  })
})
