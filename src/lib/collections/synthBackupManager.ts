import { v4 as uuidv4 } from 'uuid'
import { saveToLocalStorage, loadFromLocalStorage } from '@/utils/utils'

export type SynthBackupSource = 'internal-16' | 'manual'

export interface SynthBackupEntry {
  slot: number
  programByte: number
  sysexData: Uint8Array
  isExactLibraryMatch: boolean
  matchedPresetId?: string
  matchedPresetName?: string
  matchedPresetAuthor?: string
}

export interface SynthBackup {
  id: string
  name: string
  createdAt: string
  source: SynthBackupSource
  entries: SynthBackupEntry[]
}

interface SerializedSynthBackupEntry extends Omit<SynthBackupEntry, 'sysexData'> {
  sysexData: number[]
}

export interface SerializedSynthBackup extends Omit<SynthBackup, 'entries'> {
  entries: SerializedSynthBackupEntry[]
}

const SYNTH_BACKUP_STORAGE_KEY = 'cz101SynthBackups'

function serializeSynthBackup(backup: SynthBackup): SerializedSynthBackup {
  return {
    ...backup,
    entries: backup.entries.map((entry) => ({
      ...entry,
      sysexData: Array.from(entry.sysexData),
    })),
  }
}

function deserializeSynthBackup(backup: SerializedSynthBackup): SynthBackup {
  return {
    ...backup,
    entries: backup.entries.map((entry) => ({
      ...entry,
      sysexData: Uint8Array.from(entry.sysexData),
    })),
  }
}

function loadSerializedSynthBackups(): SerializedSynthBackup[] {
  // Migrate from old key if present
  const legacy = loadFromLocalStorage('cz101Setlists', null)
  if (legacy !== null) {
    saveToLocalStorage(SYNTH_BACKUP_STORAGE_KEY, legacy)
    saveToLocalStorage('cz101Setlists', null)
  }
  return loadFromLocalStorage(SYNTH_BACKUP_STORAGE_KEY, []) as SerializedSynthBackup[]
}

function saveSerializedSynthBackups(backups: SerializedSynthBackup[]) {
  saveToLocalStorage(SYNTH_BACKUP_STORAGE_KEY, backups)
}

export function exportAllSynthBackups(): SerializedSynthBackup[] {
  return loadSerializedSynthBackups()
}

export function importAllSynthBackups(
  serializedBackups: SerializedSynthBackup[],
  mode: 'replace' | 'merge' = 'replace',
): void {
  const incoming = serializedBackups.map((backup) => ({
    ...backup,
    entries: backup.entries.map((entry) => ({
      ...entry,
      sysexData: Array.from(entry.sysexData),
    })),
  }))

  if (mode === 'merge') {
    const current = loadSerializedSynthBackups()
    saveSerializedSynthBackups([...current, ...incoming])
    return
  }

  saveSerializedSynthBackups(incoming)
}

export function getSynthBackups(): SynthBackup[] {
  return loadSerializedSynthBackups()
    .map(deserializeSynthBackup)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function getSynthBackupById(id: string): SynthBackup | undefined {
  return getSynthBackups().find((backup) => backup.id === id)
}

export function createSynthBackup(params: {
  name: string
  source: SynthBackupSource
  entries: SynthBackupEntry[]
}): SynthBackup {
  const backup: SynthBackup = {
    id: uuidv4(),
    name: params.name,
    source: params.source,
    entries: params.entries,
    createdAt: new Date().toISOString(),
  }

  const current = loadSerializedSynthBackups()
  current.push(serializeSynthBackup(backup))
  saveSerializedSynthBackups(current)
  return backup
}

export function deleteSynthBackup(id: string): void {
  const current = loadSerializedSynthBackups()
  saveSerializedSynthBackups(current.filter((backup) => backup.id !== id))
}

export function clearAllSynthBackups(): void {
  saveSerializedSynthBackups([])
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('synth-backups-updated'))
  }
}

export function exportSynthBackup(backupId: string): string {
  const backup = getSynthBackupById(backupId)
  if (!backup) {
    throw new Error('Synth backup not found')
  }

  return JSON.stringify(serializeSynthBackup(backup), null, 2)
}

export function importSynthBackup(json: string): SynthBackup {
  const parsed = JSON.parse(json) as SerializedSynthBackup
  const imported = deserializeSynthBackup(parsed)

  const backup: SynthBackup = {
    ...imported,
    id: uuidv4(),
    createdAt: new Date().toISOString(),
  }

  const current = loadSerializedSynthBackups()
  current.push(serializeSynthBackup(backup))
  saveSerializedSynthBackups(current)
  return backup
}
