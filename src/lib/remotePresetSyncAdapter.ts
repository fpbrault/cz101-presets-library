import { createClient } from '@neondatabase/neon-js'
import { setPresetSyncAdapter } from '@/lib/presetManager'
import { loadOnlineSyncSettings } from '@/lib/onlineSyncSettings'
import type { Preset } from '@/lib/presetManager'
import { RemotePresetSyncAdapter } from '@/lib/presetSync'

type SerializedPreset = Omit<Preset, 'sysexData'> & { sysexData: number[] }

function serializePresets(presets: Preset[]): SerializedPreset[] {
  return presets.map((p) => ({ ...p, sysexData: Array.from(p.sysexData) }))
}

function deserializePresets(rows: SerializedPreset[]): Preset[] {
  return rows.map((p) => ({ ...p, sysexData: new Uint8Array(p.sysexData) })) as Preset[]
}

function getNeonDataClient() {
  const authUrl = import.meta.env.VITE_NEON_AUTH_URL
  const dataApiUrl = import.meta.env.VITE_NEON_DATA_API_URL
  if (!authUrl || !dataApiUrl) {
    throw new Error('Missing VITE_NEON_AUTH_URL or VITE_NEON_DATA_API_URL')
  }
  return createClient({ auth: { url: authUrl }, dataApi: { url: dataApiUrl } })
}

class DisabledRemotePresetSyncAdapter implements RemotePresetSyncAdapter {
  async push(_presets: Preset[]): Promise<void> {}
  async pull(): Promise<Preset[] | null> {
    return null
  }
  async isAvailable(): Promise<boolean> {
    return false
  }
}

class NeonDataApiPresetSyncAdapter implements RemotePresetSyncAdapter {
  async isAvailable(): Promise<boolean> {
    return Boolean(
      import.meta.env.VITE_NEON_AUTH_URL && import.meta.env.VITE_NEON_DATA_API_URL,
    )
  }

  async push(presets: Preset[]): Promise<void> {
    const client = getNeonDataClient()
    const { error } = await (client as any)
      .from('preset_library')
      .upsert({ presets: serializePresets(presets), updated_at: new Date().toISOString() })
    if (error) {
      throw new Error(`Backup failed: ${error.message}`)
    }
  }

  async pull(): Promise<Preset[] | null> {
    const client = getNeonDataClient()
    const { data, error } = await (client as any)
      .from('preset_library')
      .select('presets')
      .single()
    if (error?.code === 'PGRST116') {
      return null // no row yet
    }
    if (error) {
      throw new Error(`Restore failed: ${error.message}`)
    }
    return deserializePresets((data?.presets as SerializedPreset[]) ?? [])
  }
}

export function buildRemotePresetSyncAdapterFromSettings(): RemotePresetSyncAdapter {
  const settings = loadOnlineSyncSettings()

  if (!settings.enabled) {
    return new DisabledRemotePresetSyncAdapter()
  }

  return new NeonDataApiPresetSyncAdapter()
}

export function configurePresetSyncAdapterFromSettings(): void {
  setPresetSyncAdapter(buildRemotePresetSyncAdapterFromSettings())
}