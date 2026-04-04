import './App.css'
import { useEffect } from 'react'

import { QueryClientProvider } from '@tanstack/react-query'
import { MidiChannelProvider } from '@/MidiChannelContext'
import { MidiPortProvider } from '@/MidiPortContext'
import PresetManager from '@/PresetManager'
import { queryClient } from '@/queryClient'
import { SearchFilterProvider } from '@/SearchFilterContext'
import { configurePresetSyncAdapterFromSettings } from '@/lib/remotePresetSyncAdapter'
import { ensureFactoryPresetsOnFirstUse } from '@/lib/presetManager'
import { refreshOnlineAuthSession } from '@/lib/onlineAuthSession'
import { saveOnlineSyncSettings } from '@/lib/onlineSyncSettings'
import { ToastProvider } from '@/ToastContext'

export default function App() {
  useEffect(() => {
    // Handle OAuth popup callback — close popup and notify parent
    if (
      window.opener &&
      new URLSearchParams(window.location.search).get('auth_popup') === '1'
    ) {
      try {
        window.opener.postMessage({ type: 'auth_complete' }, window.location.origin)
      } catch {}
      window.close()
      return
    }

    void (async () => {
      const session = await refreshOnlineAuthSession()
      saveOnlineSyncSettings({ enabled: Boolean(session?.userId) })
      configurePresetSyncAdapterFromSettings()

      const loadedFactoryPresets = await ensureFactoryPresetsOnFirstUse()
      if (loadedFactoryPresets) {
        await queryClient.invalidateQueries({ queryKey: ['presets'] })
      }
    })()
  }, [])

  return (
    <ToastProvider>
      <QueryClientProvider client={queryClient}>
        <MidiPortProvider>
          <MidiChannelProvider>
            <SearchFilterProvider>
              <PresetManager></PresetManager>
            </SearchFilterProvider>
          </MidiChannelProvider>
        </MidiPortProvider>
      </QueryClientProvider>
    </ToastProvider>
  )
}
