import { exportPresets, importPresets } from '@/lib/presets/presetManager'
import {
  exportAllSynthBackups,
  importAllSynthBackups,
  SerializedSynthBackup,
} from '@/lib/collections/synthBackupManager'
import {
  exportAllPlaylists,
  importAllPlaylists,
  Playlist,
} from '@/lib/collections/playlistManager'
import { loadFromLocalStorage, saveToLocalStorage } from '@/utils'

const WORKSPACE_BACKUP_SCHEMA = 'cz101-workspace-backup'
const WORKSPACE_BACKUP_VERSION = 1

const APP_SETTINGS_KEYS = ['selectedMidiPort', 'selectedMidiChannel', 'autoSend']

type WorkspaceBackupSection = {
  format: string
  data: unknown
}

export interface WorkspaceBackupEnvelope {
  schema: typeof WORKSPACE_BACKUP_SCHEMA
  version: number
  createdAt: string
  sections: Record<string, WorkspaceBackupSection>
}

function parseJsonSafely(value: string): unknown {
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

export function isWorkspaceBackupEnvelope(
  value: unknown,
): value is WorkspaceBackupEnvelope {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as WorkspaceBackupEnvelope
  return (
    candidate.schema === WORKSPACE_BACKUP_SCHEMA &&
    typeof candidate.version === 'number' &&
    typeof candidate.createdAt === 'string' &&
    typeof candidate.sections === 'object' &&
    candidate.sections !== null
  )
}

function getAppSettingsSnapshot() {
  return APP_SETTINGS_KEYS.reduce(
    (acc, key) => {
      acc[key] = loadFromLocalStorage(key, null)
      return acc
    },
    {} as Record<string, unknown>,
  )
}

function applyAppSettingsSnapshot(snapshot: Record<string, unknown>) {
  APP_SETTINGS_KEYS.forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(snapshot, key)) {
      saveToLocalStorage(key, snapshot[key])
    }
  })
}

export async function exportWorkspaceBackup(): Promise<string> {
  const presetsJson = await exportPresets()
  const envelope: WorkspaceBackupEnvelope = {
    schema: WORKSPACE_BACKUP_SCHEMA,
    version: WORKSPACE_BACKUP_VERSION,
    createdAt: new Date().toISOString(),
    sections: {
      presets: {
        format: 'preset-database-json',
        data: parseJsonSafely(presetsJson),
      },
      synthBackups: {
        format: 'synth-backups-v1',
        data: exportAllSynthBackups(),
      },
      setlists: {
        format: 'setlists-v1',
        data: exportAllPlaylists(),
      },
      appSettings: {
        format: 'local-storage-v1',
        data: getAppSettingsSnapshot(),
      },
    },
  }

  return JSON.stringify(envelope)
}

export async function importWorkspaceBackup(json: string): Promise<void> {
  const parsed = JSON.parse(json) as unknown

  if (!isWorkspaceBackupEnvelope(parsed)) {
    throw new Error('Invalid workspace backup format')
  }

  const presetSection = parsed.sections.presets
  if (presetSection) {
    await importPresets(JSON.stringify(presetSection.data))
  }

  const synthBackupSection = parsed.sections.synthBackups
  if (synthBackupSection) {
    importAllSynthBackups(synthBackupSection.data as SerializedSynthBackup[], 'replace')
    window.dispatchEvent(new Event('synth-backups-updated'))
  }

  // Legacy: support old backup files that used 'setlists' for synth backups
  const legacySynthBackupSection = parsed.sections.setlists
  if (legacySynthBackupSection && !synthBackupSection) {
    importAllSynthBackups(legacySynthBackupSection.data as SerializedSynthBackup[], 'replace')
    window.dispatchEvent(new Event('synth-backups-updated'))
  }

  const setlistSection = parsed.sections.setlists
  if (setlistSection && synthBackupSection) {
    // New format: 'setlists' is now user playlists
    importAllPlaylists(setlistSection.data as Playlist[], 'replace')
  }

  const appSettingsSection = parsed.sections.appSettings
  if (appSettingsSection) {
    applyAppSettingsSnapshot(appSettingsSection.data as Record<string, unknown>)
  }
}
