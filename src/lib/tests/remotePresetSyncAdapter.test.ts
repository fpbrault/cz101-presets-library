import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { saveOnlineSyncSettings } from '@/lib/onlineSyncSettings'
import { buildRemotePresetSyncAdapterFromSettings } from '@/lib/remotePresetSyncAdapter'
import type { Preset } from '@/lib/presetManager'

vi.mock('@neondatabase/neon-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      upsert: vi.fn().mockResolvedValue({ error: null }),
      select: vi.fn(() => ({
        single: vi.fn().mockResolvedValue({
          data: { presets: [{ id: 'p1', name: 'Test', sysexData: [0xf0, 0xf7], tags: [], createdDate: '', modifiedDate: '', filename: 'test.syx' }] },
          error: null,
        }),
      })),
    })),
  })),
}))

const makePreset = (id: string): Preset =>
  ({
    id,
    name: 'Test',
    createdDate: '',
    modifiedDate: '',
    filename: 'test.syx',
    sysexData: new Uint8Array([0xf0, 0xf7]),
    tags: [],
  }) as Preset

describe('buildRemotePresetSyncAdapterFromSettings', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.stubEnv('VITE_NEON_AUTH_URL', 'https://example.neonauth.com/auth')
    vi.stubEnv('VITE_NEON_DATA_API_URL', 'https://example.apirest.com/rest/v1')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns disabled adapter when sync is not enabled', async () => {
    saveOnlineSyncSettings({ enabled: false })
    const adapter = buildRemotePresetSyncAdapterFromSettings()
    await expect(adapter.isAvailable?.()).resolves.toBe(false)
  })

  it('returns enabled adapter when sync is enabled', async () => {
    saveOnlineSyncSettings({ enabled: true })
    const adapter = buildRemotePresetSyncAdapterFromSettings()
    await expect(adapter.isAvailable?.()).resolves.toBe(true)
  })

  it('push calls upsert on preset_library', async () => {
    saveOnlineSyncSettings({ enabled: true })
    const adapter = buildRemotePresetSyncAdapterFromSettings()
    await expect(adapter.push([makePreset('p1')])).resolves.not.toThrow()
  })

  it('pull deserializes sysexData back to Uint8Array', async () => {
    saveOnlineSyncSettings({ enabled: true })
    const adapter = buildRemotePresetSyncAdapterFromSettings()
    const result = await adapter.pull()
    expect(result).not.toBeNull()
    expect(result![0].sysexData).toBeInstanceOf(Uint8Array)
  })})