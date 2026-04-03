import type { Preset } from '@/lib/presetManager'

export interface RemotePresetSyncAdapter {
  push(presets: Preset[]): Promise<void>
  pull(): Promise<Preset[] | null>
  isAvailable?(): Promise<boolean>
}

class NoopRemotePresetSyncAdapter implements RemotePresetSyncAdapter {
  async push(_presets: Preset[]): Promise<void> {}
  async pull(): Promise<Preset[] | null> {
    return null
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

  async backup(presets: Preset[]): Promise<boolean> {
    if (this.adapter.isAvailable && !(await this.adapter.isAvailable())) {
      return false
    }
    try {
      await this.adapter.push(presets)
      return true
    } catch {
      return false
    }
  }

  async restore(): Promise<Preset[] | null> {
    if (this.adapter.isAvailable && !(await this.adapter.isAvailable())) {
      return null
    }
    try {
      return await this.adapter.pull()
    } catch {
      return null
    }
  }
}
