import './App.css'
import { useEffect } from 'react'

import { QueryClientProvider } from '@tanstack/react-query'
import { MidiChannelProvider } from '@/MidiChannelContext'
import { MidiPortProvider } from '@/MidiPortContext'
import PresetManager from '@/PresetManager'
import { queryClient } from '@/queryClient'
import { SearchFilterProvider } from '@/SearchFilterContext'
import { configurePresetSyncAdapterFromSettings } from '@/lib/remotePresetSyncAdapter'

export default function App() {
  useEffect(() => {
    configurePresetSyncAdapterFromSettings()
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <MidiPortProvider>
        <MidiChannelProvider>
          <SearchFilterProvider>
            <PresetManager></PresetManager>
          </SearchFilterProvider>
        </MidiChannelProvider>
      </MidiPortProvider>
    </QueryClientProvider>
  )
}
