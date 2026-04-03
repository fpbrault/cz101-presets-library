import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  Preset,
  addPreset,
  createPresetData,
  deletePreset,
  restorePresetToBuffer,
  retrieveCurrentPresetFromSynth,
  retrievePresetSlotFromSynth,
  writePresetToSynthSlot,
} from '@/lib/presetManager'
import { loadFromLocalStorage, saveToLocalStorage } from '@/utils'

type AppMode = 'presets' | 'setlists'

interface SaveDraftPresetState {
  sysexData: Uint8Array
  matchingPreset?: Preset
  suggestedName: string
}

interface UsePresetModeParams {
  selectedMidiPort: string
  selectedMidiChannel: number
  setStatusMessage: (message: string) => void
  setCurrentPreset: (preset: Preset | null) => void
  setAppMode: (mode: AppMode) => void
}

export function usePresetMode({
  selectedMidiPort,
  selectedMidiChannel,
  setStatusMessage,
  setCurrentPreset,
  setAppMode,
}: UsePresetModeParams) {
  const queryClient = useQueryClient()
  const [editMode, setEditMode] = useState(false)
  const [autoSend, setAutoSend] = useState(
    loadFromLocalStorage('autoSend', false),
  )

  const [saveDraftPresetState, setSaveDraftPresetState] =
    useState<SaveDraftPresetState | null>(null)
  const [saveDraftName, setSaveDraftName] = useState('')
  const [saveDraftAuthor, setSaveDraftAuthor] = useState('')
  const [saveDraftTags, setSaveDraftTags] = useState('')
  const [saveDraftDescription, setSaveDraftDescription] = useState('')

  const openSaveDraftPresetModal = (
    sysexData: Uint8Array,
    matchingPreset: Preset | undefined,
    suggestedName: string,
  ) => {
    setSaveDraftPresetState({
      sysexData,
      matchingPreset,
      suggestedName,
    })

    setSaveDraftName(matchingPreset?.name || suggestedName)
    setSaveDraftAuthor(matchingPreset?.author || 'Temple of CZ')
    setSaveDraftTags((matchingPreset?.tags || []).join(', '))
    setSaveDraftDescription(matchingPreset?.description || '')
  }

  const closeSaveDraftPresetModal = () => {
    setSaveDraftPresetState(null)
    setSaveDraftName('')
    setSaveDraftAuthor('')
    setSaveDraftTags('')
    setSaveDraftDescription('')
  }

  const handleSaveDraftPreset = async () => {
    if (!saveDraftPresetState) return

    const draftPresets = await createPresetData(
      `${saveDraftPresetState.suggestedName}.syx`,
      saveDraftPresetState.sysexData,
    )

    const preset = draftPresets[0]
    if (!preset) {
      setStatusMessage('Failed to create a preset from retrieved SysEx data.')
      return
    }

    const toSave: Preset = {
      ...preset,
      name: saveDraftName.trim() || preset.name,
      author: saveDraftAuthor.trim() || 'Temple of CZ',
      description: saveDraftDescription.trim(),
      tags: saveDraftTags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
    }

    const saved = await addPreset(toSave)
    await queryClient.invalidateQueries({ queryKey: ['presets'] })
    setCurrentPreset(saved)
    setAppMode('presets')
    setStatusMessage('Retrieved preset saved to library.')
    closeSaveDraftPresetModal()
  }

  const deletePresetById = async (id: string) => {
    await deletePreset(id)
    await queryClient.invalidateQueries({ queryKey: ['presets'] })
    setCurrentPreset(null)
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

  const handleSendCurrentPreset = (currentPreset: Preset | null) => {
    if (currentPreset && selectedMidiPort) {
      restorePresetToBuffer(
        currentPreset,
        selectedMidiPort,
        selectedMidiChannel,
      )
    }
  }

  const handleRetrieveCurrentPreset = async () => {
    if (!selectedMidiPort) {
      setStatusMessage('Select a MIDI port before retrieving presets.')
      return
    }

    try {
      const { sysexData, matchingPreset } = await retrieveCurrentPresetFromSynth(
        selectedMidiPort,
        selectedMidiChannel,
      )
      openSaveDraftPresetModal(sysexData, matchingPreset, 'retrieved-current')
      setStatusMessage(
        matchingPreset
          ? `Retrieved current preset. Matched library preset: ${matchingPreset.name}.`
          : 'Retrieved current preset. No exact library match found.',
      )
    } catch (error) {
      setStatusMessage((error as Error).message)
    }
  }

  const handleRetrievePresetSlot = async (
    bank: 'internal' | 'cartridge',
    slot: number,
  ) => {
    if (!selectedMidiPort) {
      setStatusMessage('Select a MIDI port before retrieving presets.')
      return
    }

    try {
      const { sysexData, matchingPreset } = await retrievePresetSlotFromSynth(
        selectedMidiPort,
        selectedMidiChannel,
        bank,
        slot,
      )
      openSaveDraftPresetModal(sysexData, matchingPreset, `${bank}-${slot}`)
      setStatusMessage(
        matchingPreset
          ? `Retrieved ${bank} slot ${slot}. Matched library preset: ${matchingPreset.name}.`
          : `Retrieved ${bank} slot ${slot}. No exact library match found.`,
      )
    } catch (error) {
      setStatusMessage((error as Error).message)
    }
  }

  const handleWritePresetSlot = async (
    currentPreset: Preset | null,
    bank: 'internal' | 'cartridge',
    slot: number,
  ) => {
    if (!selectedMidiPort) {
      setStatusMessage('Select a MIDI port before writing presets.')
      return
    }

    if (!currentPreset) {
      setStatusMessage('Select a preset before writing to synth slot.')
      return
    }

    try {
      await writePresetToSynthSlot(
        currentPreset,
        selectedMidiPort,
        selectedMidiChannel,
        bank,
        slot,
      )
      setStatusMessage(`Wrote preset ${currentPreset.name} to ${bank} slot ${slot}.`)
    } catch (error) {
      setStatusMessage((error as Error).message)
    }
  }

  return {
    editMode,
    setEditMode,
    autoSend,
    saveDraftPresetState,
    saveDraftName,
    setSaveDraftName,
    saveDraftAuthor,
    setSaveDraftAuthor,
    saveDraftTags,
    setSaveDraftTags,
    saveDraftDescription,
    setSaveDraftDescription,
    openSaveDraftPresetModal,
    closeSaveDraftPresetModal,
    handleSaveDraftPreset,
    deletePresetById,
    handleToggleAutoSend,
    handleSelectPreset,
    handleSendCurrentPreset,
    handleRetrieveCurrentPreset,
    handleRetrievePresetSlot,
    handleWritePresetSlot,
  }
}
