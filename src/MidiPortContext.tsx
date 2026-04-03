import { createContext, useContext, useState, type ReactNode } from 'react'
import { loadFromLocalStorage } from '@/utils'

interface MidiPortContextType {
  midiPorts: string[]
  setMidiPorts: (ports: string[]) => void
  selectedMidiPort: string
  setSelectedMidiPort: (port: string) => void
}

const MidiPortContext = createContext<MidiPortContextType | undefined>(
  undefined,
)

export const MidiPortProvider = ({ children }: { children: ReactNode }) => {
  const [midiPorts, setMidiPorts] = useState<string[]>([])
  const [selectedMidiPort, setSelectedMidiPort] = useState<string>(
    loadFromLocalStorage('selectedMidiPort', ''),
  )

  return (
    <MidiPortContext.Provider
      value={{ midiPorts, setMidiPorts, selectedMidiPort, setSelectedMidiPort }}
    >
      {children}
    </MidiPortContext.Provider>
  )
}

export const useMidiPort = () => {
  const context = useContext(MidiPortContext)
  if (!context) {
    throw new Error('useMidiPort must be used within a MidiPortProvider')
  }
  return context
}
