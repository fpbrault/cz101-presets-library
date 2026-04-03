import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  Preset,
  restorePresetToBuffer,
  deletePreset,
  savePreset,
} from '@/lib/presetManager'
import { loadFromLocalStorage, saveToLocalStorage } from '@/utils'
import FilterPanel from '@/FilterPanel'
import PresetDetails from '@/PresetDetails'
import PresetList from '@/PresetList'
import OptionPanel from '@/OptionPanel'
import SettingsPanel from '@/SettingsPanel'
import { useMidiChannel } from '@/MidiChannelContext'
import { useMidiPort } from '@/MidiPortContext'
import PerformanceMode from '@/PerformanceMode'
import Button from '@/components/Button'
import { useMidiSetup } from '@/useMidiSetup'

export default function PresetManager() {
  const queryClient = useQueryClient()
  const [editMode, setEditMode] = useState(false)
  const [performanceMode, setPerformanceMode] = useState(false)
  const [currentPreset, setCurrentPreset] = useState<Preset | null>(null)
  const [autoSend, setAutoSend] = useState(
    loadFromLocalStorage('autoSend', false),
  )
  const { setMidiPorts } = useMidiPort()
  const { selectedMidiPort } = useMidiPort()
  const { selectedMidiChannel } = useMidiChannel()

  const [showDeleteModal, setShowDeleteModal] = useState(false)

  useMidiSetup(setMidiPorts)

  const handleDeletePreset = async (id: string) => {
    await deletePreset(id)
    await queryClient.invalidateQueries({ queryKey: ['presets'] })
    setCurrentPreset(null)
    setShowDeleteModal(false)
  }

  const handleToggleAutoSend = () => {
    setAutoSend((prevAutoSend: boolean) => {
      const newAutoSend = !prevAutoSend
      saveToLocalStorage('autoSend', newAutoSend)
      return newAutoSend
    })
  }

  const handleSelectPreset = (preset: Preset) => {
    setCurrentPreset(preset)

    if (autoSend && preset && selectedMidiPort) {
      restorePresetToBuffer(preset, selectedMidiPort, selectedMidiChannel)
    }
  }

  const handleSavePreset = async (slot: number) => {
    const preset = await savePreset(selectedMidiPort, slot, 'newPreset')
    await queryClient.invalidateQueries({ queryKey: ['presets'] })
    setCurrentPreset(preset)
  }

  const handleSendCurrentPreset = () => {
    if (currentPreset && selectedMidiPort) {
      restorePresetToBuffer(
        currentPreset,
        selectedMidiPort,
        selectedMidiChannel,
      )
    }
  }

  return (
    <main className="flex flex-col w-full h-full">
      {performanceMode ? (
        <>
          <div className="absolute translate-x-1/2 bottom-4 right-1/2">
            <button
              className="text-xl shadow opacity-50 btn-md btn btn-neutral hover:opacity-100"
              onClick={() => setPerformanceMode(false)}
            >
              Exit Performance Mode
            </button>
          </div>
          <PerformanceMode
            currentPreset={currentPreset}
            handleSelectPreset={handleSelectPreset}
          />
        </>
      ) : (
        <>
          <div className="flex flex-row h-full overflow-hidden">
            <div className="flex flex-col w-64 h-full gap-2 p-4 bg-base-200 min-w-64">
              <Button
                variant="secondary"
                size="lg"
                onClick={() => setPerformanceMode(true)}
              >
                Performance Mode
              </Button>
              <OptionPanel
                handleSavePreset={handleSavePreset}
                handleSendCurrentPreset={handleSendCurrentPreset}
                autoSend={autoSend}
                handleToggleAutoSend={handleToggleAutoSend}
              ></OptionPanel>
              <SettingsPanel></SettingsPanel>
              <FilterPanel></FilterPanel>
            </div>
            <PresetList
              handleSelectPreset={handleSelectPreset}
              currentPreset={currentPreset}
            ></PresetList>
            <PresetDetails
              editMode={editMode}
              currentPreset={currentPreset}
              onPresetUpdated={setCurrentPreset}
              setShowDeleteModal={setShowDeleteModal}
              setEditMode={setEditMode}
            ></PresetDetails>
          </div>
          {showDeleteModal && (
            <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
              <div className="p-4 shadow-lg bg-base-100 rounded-xl">
                <h2 className="mb-4 text-xl">Confirm Delete</h2>
                <p>Are you sure you want to delete this preset?</p>
                <div className="flex justify-end gap-2 mt-4">
                  <Button
                    variant="error"
                    onClick={() => handleDeletePreset(currentPreset?.id || '')}
                  >
                    Delete
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setShowDeleteModal(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </main>
  )
}
