import { Playlist } from '@/lib/collections/playlistManager'
import { Preset } from '@/lib/presets/presetManager'

export interface SetlistsPageProps {
  playlists: Playlist[]
  selectedPlaylistId: string | null
  presets: Preset[]
  quickSendIndex: number | null
  isQuickSending: boolean
  onSelectPlaylist: (playlistId: string) => void
  onCreatePlaylist: () => void
  onRenamePlaylist: (playlistId: string, name: string) => void
  onDeletePlaylist: (playlistId: string) => void
  onAddPreset: (playlistId: string, presetId: string) => void
  onRemoveEntry: (playlistId: string, entryId: string) => void
  onReorderEntries: (playlistId: string, fromIndex: number, toIndex: number) => void
  onStartQuickSend: (playlistId: string) => void
  onStepQuickSend: (direction: 'prev' | 'next') => void
  onStopQuickSend: () => void
  onSendCurrentToBuffer: () => void
  onPlayInPerformanceMode: (playlistId: string) => void
}
