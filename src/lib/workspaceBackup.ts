import { exportPresets, importPresets } from '@/lib/presetManager'
import {
  exportAllSetlists,
  importAllSetlists,
  SerializedSetlist,
} from '@/lib/setlistManager'
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
      setlists: {
        format: 'setlists-v1',
        data: exportAllSetlists(),
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

  const setlistSection = parsed.sections.setlists
  if (setlistSection) {
    importAllSetlists(setlistSection.data as SerializedSetlist[], 'replace')
    window.dispatchEvent(new Event('setlists-updated'))
  }

  const appSettingsSection = parsed.sections.appSettings
  if (appSettingsSection) {
    applyAppSettingsSnapshot(appSettingsSection.data as Record<string, unknown>)
  }
}
