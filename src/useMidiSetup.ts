import { useEffect } from 'react'
import { WebMidi } from 'webmidi'
import { getIoportNames } from '@/lib/presetManager'

export function useMidiSetup(setMidiPorts: (ports: string[]) => void) {
  useEffect(() => {
    let isMounted = true

    const refreshMidiPorts = async () => {
      const ports = await getIoportNames()
      if (isMounted) {
        setMidiPorts(ports)
      }
    }

    const handlePortsChanged = async () => {
      await refreshMidiPorts()
    }

    refreshMidiPorts()
    WebMidi.addListener('portschanged', handlePortsChanged)

    return () => {
      isMounted = false
      WebMidi.removeListener('portschanged', handlePortsChanged)
    }
  }, [setMidiPorts])
}