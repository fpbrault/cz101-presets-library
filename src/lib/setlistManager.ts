import { v4 as uuidv4 } from 'uuid'
import { saveToLocalStorage, loadFromLocalStorage } from '@/utils'

export type SetlistSource = 'internal-16' | 'manual'

export interface SetlistEntry {
  slot: number
  programByte: number
  sysexData: Uint8Array
  isExactLibraryMatch: boolean
  matchedPresetId?: string
  matchedPresetName?: string
  matchedPresetAuthor?: string
}

export interface Setlist {
  id: string
  name: string
  createdAt: string
  source: SetlistSource
  entries: SetlistEntry[]
}

interface SerializedSetlistEntry extends Omit<SetlistEntry, 'sysexData'> {
  sysexData: number[]
}

export interface SerializedSetlist extends Omit<Setlist, 'entries'> {
  entries: SerializedSetlistEntry[]
}

const SETLIST_STORAGE_KEY = 'cz101Setlists'

function serializeSetlist(setlist: Setlist): SerializedSetlist {
  return {
    ...setlist,
    entries: setlist.entries.map((entry) => ({
      ...entry,
      sysexData: Array.from(entry.sysexData),
    })),
  }
}

function deserializeSetlist(setlist: SerializedSetlist): Setlist {
  return {
    ...setlist,
    entries: setlist.entries.map((entry) => ({
      ...entry,
      sysexData: Uint8Array.from(entry.sysexData),
    })),
  }
}

function loadSerializedSetlists(): SerializedSetlist[] {
  return loadFromLocalStorage(SETLIST_STORAGE_KEY, []) as SerializedSetlist[]
}

function saveSerializedSetlists(setlists: SerializedSetlist[]) {
  saveToLocalStorage(SETLIST_STORAGE_KEY, setlists)
}

export function exportAllSetlists(): SerializedSetlist[] {
  return loadSerializedSetlists()
}

export function importAllSetlists(
  serializedSetlists: SerializedSetlist[],
  mode: 'replace' | 'merge' = 'replace',
): void {
  const incoming = serializedSetlists.map((setlist) => ({
    ...setlist,
    entries: setlist.entries.map((entry) => ({
      ...entry,
      sysexData: Array.from(entry.sysexData),
    })),
  }))

  if (mode === 'merge') {
    const current = loadSerializedSetlists()
    saveSerializedSetlists([...current, ...incoming])
    return
  }

  saveSerializedSetlists(incoming)
}

export function getSetlists(): Setlist[] {
  return loadSerializedSetlists()
    .map(deserializeSetlist)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function getSetlistById(id: string): Setlist | undefined {
  return getSetlists().find((setlist) => setlist.id === id)
}

export function createSetlist(params: {
  name: string
  source: SetlistSource
  entries: SetlistEntry[]
}): Setlist {
  const setlist: Setlist = {
    id: uuidv4(),
    name: params.name,
    source: params.source,
    entries: params.entries,
    createdAt: new Date().toISOString(),
  }

  const current = loadSerializedSetlists()
  current.push(serializeSetlist(setlist))
  saveSerializedSetlists(current)
  return setlist
}

export function deleteSetlist(id: string): void {
  const current = loadSerializedSetlists()
  saveSerializedSetlists(current.filter((setlist) => setlist.id !== id))
}

export function exportSetlist(setlistId: string): string {
  const setlist = getSetlistById(setlistId)
  if (!setlist) {
    throw new Error('Setlist not found')
  }

  return JSON.stringify(serializeSetlist(setlist), null, 2)
}

export function importSetlist(json: string): Setlist {
  const parsed = JSON.parse(json) as SerializedSetlist
  const imported = deserializeSetlist(parsed)

  const setlist: Setlist = {
    ...imported,
    id: uuidv4(),
    createdAt: new Date().toISOString(),
  }

  const current = loadSerializedSetlists()
  current.push(serializeSetlist(setlist))
  saveSerializedSetlists(current)
  return setlist
}
