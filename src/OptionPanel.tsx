import React, { useState } from 'react'
import { saveToLocalStorage } from './utils'

interface OptionPanelProps {
  autoSend: boolean
  midiPorts: string[]
  selectedMidiPort: string
  handleToggleAutoSend: () => void
  handleSendCurrentPreset: () => void
  setSelectedMidiPort: (port: string) => void
  handleSavePreset: (slot: number) => void
}

const OptionPanel: React.FC<OptionPanelProps> = ({
  autoSend,
  midiPorts,
  selectedMidiPort,
  handleSendCurrentPreset,
  handleToggleAutoSend,
  setSelectedMidiPort,
  handleSavePreset,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleOpenModal = () => setIsModalOpen(true)
  const handleCloseModal = () => setIsModalOpen(false)

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
        <button onClick={handleOpenModal} className="btn btn-lg btn-accent">
          Save Preset
        </button>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="p-4 shadow-lg bg-base-100 rounded-xl">
            <h2 className="mb-4 text-xl">Select Preset Slot</h2>
            <div className="grid grid-cols-4 gap-2">
              {Array.from({ length: 16 }, (_, i) => (
                <button
                  key={i + 1}
                  onClick={() => {
                    handleSavePreset(i + 1)
                    handleCloseModal()
                  }}
                  className="text-2xl font-bold btn btn-primary btn-lg"
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <button
              onClick={handleCloseModal}
              className="mt-4 btn btn-lg btn-error"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  )
}

export default OptionPanel
