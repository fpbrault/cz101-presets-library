import { Setlist } from '@/lib/setlistManager'

export interface SetlistsPageProps {
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

export interface SendModalState {
  entryIndex: number
  bank: 'internal' | 'cartridge'
  slot: number
}
