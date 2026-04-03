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
    expect(settings.username).toBe('')
    expect(isOnlineSyncEnabled()).toBe(false)
  })

  it('persists enabled sync settings', () => {
    saveOnlineSyncSettings({ enabled: true, username: 'artist01' })

    expect(loadOnlineSyncSettings()).toEqual({
      enabled: true,
      username: 'artist01',
    })
    expect(isOnlineSyncEnabled()).toBe(true)
  })
})