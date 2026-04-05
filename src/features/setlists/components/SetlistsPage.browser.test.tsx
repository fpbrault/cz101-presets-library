import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SynthBackupsPage from '@/features/synthBackups/components/SynthBackupsPage'
import { renderWithProviders } from '@/test/renderWithProviders'
import type { SynthBackup } from '@/lib/synthBackupManager'

const noopProps = {
  isBackingUp: false,
  backupProgress: null,
  isRestoring: false,
  restoreProgress: null,
  onSelectBackup: vi.fn(),
  onCreateBackup: vi.fn(),
  onRestoreBackupToSynth: vi.fn(),
  onDeleteBackup: vi.fn(),
  onExportBackup: vi.fn(),
  onImportBackup: vi.fn(),
  onSaveEntryAsPreset: vi.fn(),
  onSendEntryToSlot: vi.fn(),
  onPreviewEntryInBuffer: vi.fn(),
}

function makeBackup(overrides: Partial<SynthBackup> = {}): SynthBackup {
  return {
    id: 'sl-1',
    name: 'Test Backup',
    source: 'internal-16',
    createdAt: new Date().toISOString(),
    entries: [],
    ...overrides,
  }
}

describe('SynthBackupsPage (browser)', () => {
  it('shows a notice when no backup is selected', () => {
    renderWithProviders(
      <SynthBackupsPage
        {...noopProps}
        backups={[]}
        selectedBackupId={null}
      />,
    )
    expect(screen.getByText(/select a synth backup/i)).toBeTruthy()
  })

  it('does not show the notice when a backup is selected', () => {
    const backup = makeBackup()
    renderWithProviders(
      <SynthBackupsPage
        {...noopProps}
        backups={[backup]}
        selectedBackupId={backup.id}
      />,
    )
    expect(screen.queryByText(/select a synth backup/i)).toBeNull()
  })

  it('renders the selected backup name', () => {
    const backup = makeBackup({ name: 'Live Gig 2024' })
    renderWithProviders(
      <SynthBackupsPage
        {...noopProps}
        backups={[backup]}
        selectedBackupId={backup.id}
      />,
    )
    expect(screen.getAllByText('Live Gig 2024').length).toBeGreaterThan(0)
  })

  it('renders multiple backups in the sidebar', () => {
    const backups = [
      makeBackup({ id: 'sl-1', name: 'Backup One' }),
      makeBackup({ id: 'sl-2', name: 'Backup Two' }),
    ]
    renderWithProviders(
      <SynthBackupsPage
        {...noopProps}
        backups={backups}
        selectedBackupId={null}
      />,
    )
    expect(screen.getByText('Backup One')).toBeTruthy()
    expect(screen.getByText('Backup Two')).toBeTruthy()
  })

  it('calls onSelectBackup when a backup item is clicked', async () => {
    const user = userEvent.setup()
    const onSelectBackup = vi.fn()
    const backup = makeBackup({ id: 'sl-click', name: 'Click Me' })

    renderWithProviders(
      <SynthBackupsPage
        {...noopProps}
        backups={[backup]}
        selectedBackupId={null}
        onSelectBackup={onSelectBackup}
      />,
    )

    await user.click(screen.getByText('Click Me'))
    expect(onSelectBackup).toHaveBeenCalledWith('sl-click')
  })

  it('shows entry count for a selected backup with entries', () => {
    const backup = makeBackup({
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
      <SynthBackupsPage
        {...noopProps}
        backups={[backup]}
        selectedBackupId={backup.id}
      />,
    )

    // The entries table should show slot numbers
    expect(screen.getAllByText(/slot/i).length).toBeGreaterThan(0)
  })
})
