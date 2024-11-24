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
import './App.css'
import { loadFromLocalStorage, saveToLocalStorage } from './utils'
import FilterPanel from './FilterPanel'
import PresetDetails from './PresetDetails'
import PresetList from './PresetList'
import useDragDrop from './useDragDrop'

export default function App() {
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
  const [refreshPresets, setRefreshPresets] = useState(false)
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

  useDragDrop(createPresetData, addPreset, setRefreshPresets)

  const handleDeletePreset = async (id: string) => {
    await deletePreset(id)
    setRefreshPresets((prev) => !prev)
    setCurrentPreset(null)
    setShowDeleteModal(false)
  }

  const handleTagClick = (tag: string) => {
    setSelectedTags((prevTags) => {
      const newTags = prevTags.includes(tag)
        ? prevTags.filter((t) => t !== tag)
        : [...prevTags, tag]
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

  const handleRowClick = (e: React.MouseEvent<HTMLTableRowElement>) => {
    const id = e.currentTarget.children[0].textContent
    if (id) {
      const preset = presets.find((p) => p.id === id)
      if (preset) {
        handleSelectPreset(preset)
      }
    }
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (currentPreset) {
        const currentIndex = presets.findIndex(
          (preset) => preset.id === currentPreset.id,
        )
        if (e.key === 'ArrowUp' && currentIndex > 0) {
          handleSelectPreset(presets[currentIndex - 1])
        } else if (e.key === 'ArrowDown' && currentIndex < presets.length - 1) {
          handleSelectPreset(presets[currentIndex + 1])
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [currentPreset, presets, autoSend, selectedMidiPort])

  const filteredPresets = presets.filter((preset) => {
    if (selectedTags.length === 0) return true
    const presetTags = new Set(preset.tags)
    if (filterMode === 'inclusive') {
      return selectedTags.every((tag) => presetTags.has(tag))
    } else {
      return selectedTags.some((tag) => presetTags.has(tag))
    }
  })

  return (
    <main className="flex flex-col h-full">
      <div className="flex flex-row h-full overflow-auto">
        <FilterPanel
          autoSend={autoSend}
          midiPorts={midiPorts}
          selectedMidiPort={selectedMidiPort}
          selectedTags={selectedTags}
          filterMode={filterMode}
          presets={presets}
          handleToggleAutoSend={handleToggleAutoSend}
          handleClearFilters={handleClearFilters}
          handleToggleFilterMode={handleToggleFilterMode}
          handleTagClick={handleTagClick}
          setSelectedMidiPort={setSelectedMidiPort}
        ></FilterPanel>
        <PresetList
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
          <div className="bg-base-100 p-4 rounded-xl shadow-lg">
            <h2 className="text-xl mb-4">Confirm Delete</h2>
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
