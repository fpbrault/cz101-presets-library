import { useState, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { WebMidi } from 'webmidi'
import {
  Preset,
  restorePresetToBuffer,
  getIoportNames,
  deletePreset,
  updatePreset,
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

export default function PresetManager() {
  const queryClient = useQueryClient()
  const [editMode, setEditMode] = useState(false)
  const [performanceMode, setPerformanceMode] = useState(false)
  const [currentPreset, setCurrentPreset] = useState<Preset | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    filename: '',
    tags: '',
    description: '',
    author: '',
    createdDate: '',
    modifiedDate: '',
  })
  const [autoSend, setAutoSend] = useState(
    loadFromLocalStorage('autoSend', false),
  )
  const { setMidiPorts } = useMidiPort()
  const { selectedMidiPort } = useMidiPort()
  const { selectedMidiChannel } = useMidiChannel()

  const [showDeleteModal, setShowDeleteModal] = useState(false)

  useEffect(() => {
    const fetchIoportNames = async () => {
      const ports = await getIoportNames()
      setMidiPorts(ports)
    }
    fetchIoportNames()

    const handlePortsChanged = async () => {
      const ports = await getIoportNames()
      setMidiPorts(ports)
    }

    WebMidi.addListener('portschanged', handlePortsChanged)

    return () => {
      WebMidi.removeListener('portschanged', handlePortsChanged)
    }
  }, [selectedMidiPort])

  useEffect(() => {
    if (currentPreset) {
      setFormData({
        name: currentPreset.name,
        filename: currentPreset.filename,
        tags: currentPreset.tags.join(','),
        description: currentPreset.description || '',
        author: currentPreset.author || '',
        createdDate: currentPreset.createdDate,
        modifiedDate: currentPreset.modifiedDate,
      })
    }
  }, [currentPreset])

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { id, value } = e.target
    setFormData((prevData) => ({ ...prevData, [id]: value }))
  }

  const handleSave = async () => {
    if (currentPreset) {
      const updatedPreset = {
        ...currentPreset,
        ...formData,
        tags: formData.tags.split(','),
      }
      await updatePreset(updatedPreset)
      setCurrentPreset(updatedPreset)
      setEditMode(false)
    }
  }

  const handleCancel = () => {
    if (currentPreset) {
      setFormData({
        name: currentPreset.name,
        filename: currentPreset.filename,
        tags: currentPreset.tags.join(','),
        description: currentPreset.description || '',
        author: currentPreset.author || '',
        createdDate: currentPreset.createdDate,
        modifiedDate: currentPreset.modifiedDate,
      })
    }
    setEditMode(false)
  }

  const handleDeletePreset = async (id: string) => {
    await deletePreset(id)
    await queryClient.invalidateQueries({ queryKey: ['presets'] })
    setCurrentPreset(null)
    setShowDeleteModal(false)
  }

  const handleToggleAutoSend = () => {
    setAutoSend((prevAutoSend: any) => {
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
              formData={formData}
              handleInputChange={handleInputChange}
              handleSave={handleSave}
              handleCancel={handleCancel}
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
