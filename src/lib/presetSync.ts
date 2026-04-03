import type { Preset } from '@/lib/presetManager'

export type PresetSyncOperation =
  | {
      type: 'upsert'
      timestamp: string
      preset: Preset
    }
  | {
      type: 'delete'
      timestamp: string
      presetId: string
    }
  | {
      type: 'replace-all'
      timestamp: string
      presets: Preset[]
    }

export interface RemotePresetSyncAdapter {
  pushOperations(operations: PresetSyncOperation[]): Promise<void>
  isAvailable?(): Promise<boolean>
}

const SYNC_QUEUE_STORAGE_KEY = 'cz101.preset-sync-queue.v1'

function canUseLocalStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function loadQueue(): PresetSyncOperation[] {
  if (!canUseLocalStorage()) {
    return []
  }

  try {
    const raw = window.localStorage.getItem(SYNC_QUEUE_STORAGE_KEY)
    if (!raw) {
      return []
    }

    const parsed = JSON.parse(raw) as PresetSyncOperation[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveQueue(queue: PresetSyncOperation[]): void {
  if (!canUseLocalStorage()) {
    return
  }
  window.localStorage.setItem(SYNC_QUEUE_STORAGE_KEY, JSON.stringify(queue))
}

class NoopRemotePresetSyncAdapter implements RemotePresetSyncAdapter {
  async pushOperations(_operations: PresetSyncOperation[]): Promise<void> {
    // No-op by default. Real adapters can be injected when online sync is configured.
  }

  async isAvailable(): Promise<boolean> {
    return false
  }
}

export class PresetSyncCoordinator {
  private adapter: RemotePresetSyncAdapter

  constructor(adapter: RemotePresetSyncAdapter = new NoopRemotePresetSyncAdapter()) {
    this.adapter = adapter
  }

  setAdapter(adapter: RemotePresetSyncAdapter): void {
    this.adapter = adapter
  }

  enqueue(operation: PresetSyncOperation): void {
    const nextQueue = [...loadQueue(), operation]
    saveQueue(nextQueue)
  }

  enqueueUpsert(preset: Preset): void {
    this.enqueue({
      type: 'upsert',
      timestamp: new Date().toISOString(),
      preset,
    })
  }

  enqueueDelete(presetId: string): void {
    this.enqueue({
      type: 'delete',
      timestamp: new Date().toISOString(),
      presetId,
    })
  }

  enqueueReplaceAll(presets: Preset[]): void {
    this.enqueue({
      type: 'replace-all',
      timestamp: new Date().toISOString(),
      presets,
    })
  }

  async flush(): Promise<boolean> {
    const queue = loadQueue()
    if (queue.length === 0) {
      return true
    }

    if (this.adapter.isAvailable && !(await this.adapter.isAvailable())) {
      return false
    }

    try {
      await this.adapter.pushOperations(queue)
      saveQueue([])
      return true
    } catch {
      return false
    }
  }

  getQueueLength(): number {
    return loadQueue().length
  }
}