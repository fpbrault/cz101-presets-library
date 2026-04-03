import { beforeEach, describe, expect, it } from 'vitest'
import {
  isOnlineSyncEnabled,
  loadOnlineSyncSettings,
  saveOnlineSyncSettings,
} from '@/lib/onlineSyncSettings'

describe('onlineSyncSettings', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('defaults to local-only mode', () => {
    const settings = loadOnlineSyncSettings()

    expect(settings.enabled).toBe(false)
    expect(isOnlineSyncEnabled()).toBe(false)
  })

  it('persists enabled sync settings', () => {
    saveOnlineSyncSettings({ enabled: true })

    expect(loadOnlineSyncSettings()).toEqual({ enabled: true })
    expect(isOnlineSyncEnabled()).toBe(true)
  })
})