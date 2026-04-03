import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  PresetSyncCoordinator,
  RemotePresetSyncAdapter,
} from '@/lib/presetSync'
import type { Preset } from '@/lib/presetManager'

const makePreset = (id: string): Preset =>
  ({
    id,
    name: 'Test',
    createdDate: '',
    modifiedDate: '',
    filename: 'test.syx',
    sysexData: new Uint8Array(),
    tags: [],
  }) as Preset

describe('PresetSyncCoordinator', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns false from backup when adapter is unavailable', async () => {
    const adapter: RemotePresetSyncAdapter = {
      isAvailable: vi.fn().mockResolvedValue(false),
      push: vi.fn(),
      pull: vi.fn(),
    }
    const coordinator = new PresetSyncCoordinator(adapter)

    const result = await coordinator.backup([makePreset('p1')])

    expect(result).toBe(false)
    expect(adapter.push).not.toHaveBeenCalled()
  })

  it('pushes presets when adapter is available', async () => {
    const push = vi.fn().mockResolvedValue(undefined)
    const adapter: RemotePresetSyncAdapter = {
      isAvailable: vi.fn().mockResolvedValue(true),
      push,
      pull: vi.fn(),
    }
    const coordinator = new PresetSyncCoordinator(adapter)

    const presets = [makePreset('p1'), makePreset('p2')]
    const result = await coordinator.backup(presets)

    expect(result).toBe(true)
    expect(push).toHaveBeenCalledWith(presets)
  })

  it('returns null from restore when adapter is unavailable', async () => {
    const adapter: RemotePresetSyncAdapter = {
      isAvailable: vi.fn().mockResolvedValue(false),
      push: vi.fn(),
      pull: vi.fn(),
    }
    const coordinator = new PresetSyncCoordinator(adapter)

    const result = await coordinator.restore()
    expect(result).toBeNull()
    expect(adapter.pull).not.toHaveBeenCalled()
  })

  it('pulls presets when adapter is available', async () => {
    const presets = [makePreset('p1')]
    const adapter: RemotePresetSyncAdapter = {
      isAvailable: vi.fn().mockResolvedValue(true),
      push: vi.fn(),
      pull: vi.fn().mockResolvedValue(presets),
    }
    const coordinator = new PresetSyncCoordinator(adapter)

    const result = await coordinator.restore()
    expect(result).toEqual(presets)
  })
})