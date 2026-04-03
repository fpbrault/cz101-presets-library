import './App.css'

import { QueryClientProvider } from '@tanstack/react-query'
import { MidiChannelProvider } from '@/MidiChannelContext'
import { MidiPortProvider } from '@/MidiPortContext'
import PresetManager from '@/PresetManager'
import { queryClient } from '@/queryClient'
import { SearchFilterProvider } from '@/SearchFilterContext'

export default function App() {
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
