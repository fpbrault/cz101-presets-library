import React, { createContext, useContext, useState, ReactNode } from 'react'

interface MidiChannelContextType {
  selectedMidiChannel: number
  setSelectedMidiChannel: (channel: number) => void
}

const MidiChannelContext = createContext<MidiChannelContextType | undefined>(
  undefined,
)

export const MidiChannelProvider = ({
  children,
  initialChannel = 1,
}: {
  children: ReactNode
  initialChannel?: number
}) => {
  const [selectedMidiChannel, setSelectedMidiChannel] =
    useState<number>(initialChannel)
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
