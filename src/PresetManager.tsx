import { useState, useEffect } from 'react'

import { WebMidi } from 'webmidi'
import {
  Preset,
  restorePresetToBuffer,
  getIoportNames,
  deletePreset,
  getPresets,
  updatePreset,
  addPreset,
  createPresetData,
} from './lib/presetManager'
import { getCurrentWebview } from '@tauri-apps/api/webview'
import { loadFromLocalStorage, saveToLocalStorage } from './utils'
import FilterPanel from './FilterPanel'
import PresetDetails from './PresetDetails'
import PresetList from './PresetList'
import OptionPanel from './OptionPanel'
import SettingsPanel from './SettingsPanel'
import { useRefresh } from './RefreshContext'
import useDragDrop from './useDragDrop'

export default function PresetManager() {
  const [editMode, setEditMode] = useState(false)
  const [presets, setPresets] = useState<Preset[]>([])
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
  const [selectedTags, setSelectedTags] = useState<string[]>(
    loadFromLocalStorage('selectedTags', []),
  )
  const [filterMode, setFilterMode] = useState<'inclusive' | 'exclusive'>(
    loadFromLocalStorage('filterMode', 'inclusive'),
  )
  const [autoSend, setAutoSend] = useState(
    loadFromLocalStorage('autoSend', false),
  )
  const [midiPorts, setMidiPorts] = useState<string[]>([])
  const [selectedMidiPort, setSelectedMidiPort] = useState<string>(
    loadFromLocalStorage('selectedMidiPort', ''),
  )
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const { refreshPresets, triggerRefresh } = useRefresh()

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

  useEffect(() => {
    const fetchPresets = async () => {
      const presetList = await getPresets()
      setPresets(presetList)
    }
    fetchPresets()
  }, [editMode, refreshPresets])

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

  useDragDrop()

  const handleDeletePreset = async (id: string) => {
    await deletePreset(id)
    triggerRefresh()
    setCurrentPreset(null)
    setShowDeleteModal(false)
  }

  const handleTagClick = (tag: string) => {
    const lowerCaseTag = tag.toLowerCase()
    setSelectedTags((prevTags) => {
      const newTags = prevTags.includes(lowerCaseTag)
        ? prevTags.filter((t) => t.toLowerCase() !== lowerCaseTag)
        : [...prevTags, lowerCaseTag]
      saveToLocalStorage('selectedTags', newTags)
      return newTags
    })
  }

  const handleClearFilters = () => {
    setSelectedTags([])
    saveToLocalStorage('selectedTags', [])
  }

  const handleToggleFilterMode = () => {
    setFilterMode((prevMode) => {
      const newMode = prevMode === 'inclusive' ? 'exclusive' : 'inclusive'
      saveToLocalStorage('filterMode', newMode)
      return newMode
    })
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
      restorePresetToBuffer(preset, selectedMidiPort)
    }
  }

  const handleSendCurrentPreset = () => {
    if (currentPreset && selectedMidiPort) {
      restorePresetToBuffer(currentPreset, selectedMidiPort)
    }
  }

  const handleRowClick = (e: React.MouseEvent<HTMLTableRowElement>) => {
    const id = e.currentTarget.children[0].textContent
    if (id) {
      const preset = presets.find((p) => p.id === id)
      if (preset) {
        handleSelectPreset(preset)
      }
    }
  }

  const filteredPresets = presets.filter((preset) => {
    if (selectedTags.length === 0) return true
    const presetTags = new Set(preset.tags.map((tag) => tag.toLowerCase()))
    if (filterMode === 'inclusive') {
      return selectedTags.every((tag) => presetTags.has(tag.toLowerCase()))
    } else {
      return selectedTags.some((tag) => presetTags.has(tag.toLowerCase()))
    }
  })

  return (
    <main className="flex flex-col h-full">
      <div className="flex flex-row h-full overflow-auto">
        <div className="flex flex-col w-64 h-full gap-2 p-4 overflow-auto bg-base-200">
          <OptionPanel
            handleSendCurrentPreset={handleSendCurrentPreset}
            autoSend={autoSend}
            midiPorts={midiPorts}
            selectedMidiPort={selectedMidiPort}
            handleToggleAutoSend={handleToggleAutoSend}
            setSelectedMidiPort={setSelectedMidiPort}
          ></OptionPanel>
          <SettingsPanel></SettingsPanel>
          <FilterPanel
            selectedTags={selectedTags}
            filterMode={filterMode}
            presets={presets}
            handleClearFilters={handleClearFilters}
            handleToggleFilterMode={handleToggleFilterMode}
            handleTagClick={handleTagClick}
          ></FilterPanel>
        </div>
        <PresetList
          handleSelectPreset={handleSelectPreset}
          currentPreset={currentPreset}
          filteredPresets={filteredPresets}
          handleRowClick={handleRowClick}
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
              <button
                className="btn btn-error"
                onClick={() => handleDeletePreset(currentPreset?.id || '')}
              >
                Delete
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => setShowDeleteModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
