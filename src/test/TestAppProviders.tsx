import { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MidiChannelProvider } from '@/context/MidiChannelContext'
import { MidiPortProvider } from '@/context/MidiPortContext'
import { SearchFilterProvider } from '@/context/SearchFilterContext'

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  })
}

interface TestAppProvidersProps {
  children: ReactNode
}

export function TestAppProviders({ children }: TestAppProvidersProps) {
  const queryClient = createTestQueryClient()

  return (
    <QueryClientProvider client={queryClient}>
      <MidiPortProvider>
        <MidiChannelProvider>
          <SearchFilterProvider>{children}</SearchFilterProvider>
        </MidiChannelProvider>
      </MidiPortProvider>
    </QueryClientProvider>
  )
}
