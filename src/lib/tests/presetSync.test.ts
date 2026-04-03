import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  PresetSyncCoordinator,
  RemotePresetSyncAdapter,
} from '@/lib/presetSync'

describe('PresetSyncCoordinator', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('queues operations locally', () => {
    const coordinator = new PresetSyncCoordinator()

    coordinator.enqueueDelete('preset-1')

    expect(coordinator.getQueueLength()).toBe(1)
  })

  it('flushes queued operations when adapter is available', async () => {
    const pushOperations = vi.fn().mockResolvedValue(undefined)
    const adapter: RemotePresetSyncAdapter = {
      isAvailable: vi.fn().mockResolvedValue(true),
      pushOperations,
    }
    const coordinator = new PresetSyncCoordinator(adapter)

    coordinator.enqueueDelete('preset-1')
    const flushed = await coordinator.flush()

    expect(flushed).toBe(true)
    expect(pushOperations).toHaveBeenCalledTimes(1)
    expect(coordinator.getQueueLength()).toBe(0)
  })

  it('keeps queue when adapter is unavailable', async () => {
    const pushOperations = vi.fn().mockResolvedValue(undefined)
    const adapter: RemotePresetSyncAdapter = {
      isAvailable: vi.fn().mockResolvedValue(false),
      pushOperations,
    }
    const coordinator = new PresetSyncCoordinator(adapter)

    coordinator.enqueueDelete('preset-2')
    const flushed = await coordinator.flush()

    expect(flushed).toBe(false)
    expect(pushOperations).not.toHaveBeenCalled()
    expect(coordinator.getQueueLength()).toBe(1)
  })
})