import React, { useState } from 'react'
import { saveToLocalStorage } from './utils'
import Button from './components/Button'

interface OptionPanelProps {
  autoSend: boolean
  midiPorts: string[]
  selectedMidiPort: string
  selectedMidiChannel: number
  handleToggleAutoSend: () => void
  handleSendCurrentPreset: () => void
  setSelectedMidiPort: (port: string) => void
  setSelectedMidiChannel: (channel: number) => void
  handleSavePreset: (slot: number) => void
}

const OptionPanel: React.FC<OptionPanelProps> = ({
  autoSend,
  midiPorts,
  selectedMidiPort,
  selectedMidiChannel,
  handleSendCurrentPreset,
  handleToggleAutoSend,
  setSelectedMidiPort,
  setSelectedMidiChannel,
  handleSavePreset,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleOpenModal = () => setIsModalOpen(true)
  const handleCloseModal = () => setIsModalOpen(false)

  return (
    <>
      <div className="flex flex-col gap-2">
        <Button onClick={handleSendCurrentPreset} variant="primary">
          Send Preset
        </Button>
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
        <select
          className="select select-bordered"
          value={selectedMidiChannel}
          onChange={(e) => {
            const channel = parseInt(e.target.value, 10)
            setSelectedMidiChannel(channel)
            saveToLocalStorage('selectedMidiChannel', channel)
          }}
        >
          {Array.from({ length: 16 }, (_, i) => (
            <option key={i + 1} value={i + 1}>
              Channel {i + 1}
            </option>
          ))}
        </select>
        <Button onClick={handleOpenModal} variant="accent">
          Save Preset
        </Button>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="p-4 shadow-lg bg-base-100 rounded-xl">
            <h2 className="mb-4 text-xl">Select Preset Slot</h2>
            <div className="grid grid-cols-4 gap-2">
              {Array.from({ length: 16 }, (_, i) => (
                <Button
                  key={i + 1}
                  onClick={() => {
                    handleSavePreset(i + 1)
                    handleCloseModal()
                  }}
                  variant="primary"
                  className="text-2xl font-bold"
                >
                  {i + 1}
                </Button>
              ))}
            </div>
            <Button onClick={handleCloseModal} variant="error" className="mt-4">
              Close
            </Button>
          </div>
        </div>
      )}
    </>
  )
}

export default OptionPanel
