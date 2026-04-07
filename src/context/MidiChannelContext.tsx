import { createContext, useContext, useState, type ReactNode } from 'react'
import { loadFromLocalStorage } from '@/utils/utils'

interface MidiChannelContextType {
  selectedMidiChannel: number
  setSelectedMidiChannel: (channel: number) => void
}

const MidiChannelContext = createContext<MidiChannelContextType | undefined>(
  undefined,
)

export const MidiChannelProvider = ({
  children,
}: {
  children: ReactNode
}) => {
  const [selectedMidiChannel, setSelectedMidiChannel] =
    useState<number>(loadFromLocalStorage('selectedMidiChannel', 1))
  return (
    <MidiChannelContext.Provider
      value={{ selectedMidiChannel, setSelectedMidiChannel }}
    >
      {children}
    </MidiChannelContext.Provider>
  )
}

export const useMidiChannel = () => {
  const context = useContext(MidiChannelContext)
  if (!context) {
    throw new Error('useMidiChannel must be used within a MidiChannelProvider')
  }
  return context
}
