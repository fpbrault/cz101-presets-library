import { v4 as uuidv4 } from 'uuid'
import { saveToLocalStorage, loadFromLocalStorage } from '@/utils/utils'

export interface PlaylistEntry {
  id: string
  presetId: string
}

export interface Playlist {
  id: string
  name: string
  createdAt: string
  entries: PlaylistEntry[]
}

const PLAYLIST_STORAGE_KEY = 'cz101Playlists'

function loadPlaylists(): Playlist[] {
  return loadFromLocalStorage(PLAYLIST_STORAGE_KEY, []) as Playlist[]
}

function savePlaylists(playlists: Playlist[]): void {
  saveToLocalStorage(PLAYLIST_STORAGE_KEY, playlists)
}

export function exportAllPlaylists(): Playlist[] {
  return loadPlaylists()
}

export function importAllPlaylists(
  playlists: Playlist[],
  mode: 'replace' | 'merge' = 'replace',
): void {
  if (mode === 'merge') {
    const current = loadPlaylists()
    savePlaylists([...current, ...playlists])
    return
  }
  savePlaylists(playlists)
}

export function getPlaylists(): Playlist[] {
  return loadPlaylists().sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function getPlaylistById(id: string): Playlist | undefined {
  return loadPlaylists().find((playlist) => playlist.id === id)
}

export function createPlaylist(name: string): Playlist {
  const playlist: Playlist = {
    id: uuidv4(),
    name,
    createdAt: new Date().toISOString(),
    entries: [],
  }

  const current = loadPlaylists()
  current.push(playlist)
  savePlaylists(current)
  return playlist
}

export function renamePlaylist(id: string, name: string): void {
  const playlists = loadPlaylists()
  const index = playlists.findIndex((p) => p.id === id)
  if (index !== -1) {
    playlists[index] = { ...playlists[index], name }
    savePlaylists(playlists)
  }
}

export function deletePlaylist(id: string): void {
  savePlaylists(loadPlaylists().filter((p) => p.id !== id))
}

export function addPresetToPlaylist(playlistId: string, presetId: string): void {
  const playlists = loadPlaylists()
  const index = playlists.findIndex((p) => p.id === playlistId)
  if (index !== -1) {
    const entry: PlaylistEntry = { id: uuidv4(), presetId }
    playlists[index] = {
      ...playlists[index],
      entries: [...playlists[index].entries, entry],
    }
    savePlaylists(playlists)
  }
}

export function removePlaylistEntry(playlistId: string, entryId: string): void {
  const playlists = loadPlaylists()
  const index = playlists.findIndex((p) => p.id === playlistId)
  if (index !== -1) {
    playlists[index] = {
      ...playlists[index],
      entries: playlists[index].entries.filter((e) => e.id !== entryId),
    }
    savePlaylists(playlists)
  }
}

export function reorderPlaylistEntries(
  playlistId: string,
  entries: PlaylistEntry[],
): void {
  const playlists = loadPlaylists()
  const index = playlists.findIndex((p) => p.id === playlistId)
  if (index !== -1) {
    playlists[index] = { ...playlists[index], entries }
    savePlaylists(playlists)
  }
}
