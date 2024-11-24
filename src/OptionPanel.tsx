import React from 'react'
import { saveToLocalStorage } from './utils'

interface OptionPanelProps {
  autoSend: boolean
  midiPorts: string[]
  selectedMidiPort: string
  handleToggleAutoSend: () => void
  handleSendCurrentPreset: () => void
  setSelectedMidiPort: (port: string) => void
}

const OptionPanel: React.FC<OptionPanelProps> = ({
  autoSend,
  midiPorts,
  selectedMidiPort,
  handleSendCurrentPreset,
  handleToggleAutoSend,
  setSelectedMidiPort,
}) => {
  return (
    <>
      <div className="flex flex-col gap-2">
        <button
          onClick={handleSendCurrentPreset}
          className="btn btn-lg btn-primary"
        >
          Send Preset
        </button>
        <div className="form-control w-52">
          <label className="cursor-pointer label">
            <span className="label-text">Auto Send</span>
            <input
              type="checkbox"
              className="toggle toggle-secondary toggle-lg"
              checked={autoSend}
              onChange={handleToggleAutoSend}
            />
          </label>
        </div>
        <select
          className="select select-bordered"
          value={selectedMidiPort}
          onChange={(e) => {
            setSelectedMidiPort(e.target.value)
            saveToLocalStorage('selectedMidiPort', e.target.value)
          }}
        >
          {midiPorts.map((port) => (
            <option key={port} value={port}>
              {port}
            </option>
          ))}
        </select>
      </div>
    </>
  )
}

export default OptionPanel
