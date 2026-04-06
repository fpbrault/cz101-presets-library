import { loadFromLocalStorage, saveToLocalStorage } from '@/utils'

const ONLINE_SYNC_SETTINGS_KEY = 'cz101.online-sync-settings.v1'

export interface OnlineSyncSettings {
  enabled: boolean
}

const DEFAULT_ONLINE_SYNC_SETTINGS: OnlineSyncSettings = {
  enabled: false,
}

export function loadOnlineSyncSettings(): OnlineSyncSettings {
  if (typeof window === 'undefined') {
    return DEFAULT_ONLINE_SYNC_SETTINGS
  }

  const stored = loadFromLocalStorage(
    ONLINE_SYNC_SETTINGS_KEY,
    DEFAULT_ONLINE_SYNC_SETTINGS,
  ) as Partial<OnlineSyncSettings>

  return {
    enabled: Boolean(stored.enabled),
  }
}

export function saveOnlineSyncSettings(settings: OnlineSyncSettings): void {
  if (typeof window === 'undefined') {
    return
  }

  saveToLocalStorage(ONLINE_SYNC_SETTINGS_KEY, {
    enabled: settings.enabled,
  })
}

export function isOnlineSyncEnabled(): boolean {
  return loadOnlineSyncSettings().enabled
}