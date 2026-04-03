import { useState } from 'react'
import { Preset } from '@/lib/presetManager'
import PresetDetails from '@/PresetDetails'
import PresetList from '@/PresetList'
import OptionPanel from '@/OptionPanel'
import SettingsPanel from '@/SettingsPanel'
import { useMidiChannel } from '@/MidiChannelContext'
import { useMidiPort } from '@/MidiPortContext'
import PerformanceMode from '@/PerformanceMode'
import Button from '@/components/Button'
import { useMidiSetup } from '@/useMidiSetup'
import SetlistsPage from '@/SetlistsPage'
import SaveDraftPresetModal from '@/SaveDraftPresetModal'
import { usePresetMode } from '@/usePresetMode'
import { useSetlistMode } from '@/useSetlistMode'

type AppMode = 'presets' | 'setlists'

export default function PresetManager() {
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(true)
  const [performanceMode, setPerformanceMode] = useState(false)
  const [currentPreset, setCurrentPreset] = useState<Preset | null>(null)
  const [appMode, setAppMode] = useState<AppMode>('presets')
  const [statusMessage, setStatusMessage] = useState<string>('')

  const { setMidiPorts, selectedMidiPort } = useMidiPort()
  const { selectedMidiChannel } = useMidiChannel()

  const [showDeleteModal, setShowDeleteModal] = useState(false)

  useMidiSetup(setMidiPorts)

  const presetMode = usePresetMode({
    selectedMidiPort,
    selectedMidiChannel,
    setStatusMessage,
    setCurrentPreset,
    setAppMode,
  })

  const setlistMode = useSetlistMode({
    selectedMidiPort,
    selectedMidiChannel,
    setStatusMessage,
    setAppMode,
    openSaveDraftPresetModal: presetMode.openSaveDraftPresetModal,
  })

  const handleDeletePreset = async (id: string) => {
    await presetMode.deletePresetById(id)
    setShowDeleteModal(false)
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
            handleSelectPreset={presetMode.handleSelectPreset}
          />
        </>
      ) : (
        <>
          <div className="flex flex-row h-full overflow-hidden">
            <div
              className={
                'relative flex flex-col h-full gap-2 p-3 bg-base-200 transition-all duration-200 border-r border-base-content/10 ' +
                (leftPanelCollapsed ? 'w-14 min-w-14' : 'w-64 min-w-64')
              }
            >
              <Button
                variant="secondary"
                size="sm"
                className="w-full"
                onClick={() => setLeftPanelCollapsed((prev) => !prev)}
              >
                {leftPanelCollapsed ? '>' : '<'}
              </Button>

              {leftPanelCollapsed ? (
                <div className="flex flex-col items-center gap-2 pt-1">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full text-[10px]"
                    onClick={() => setPerformanceMode(true)}
                  >
                    PM
                  </Button>
                  <Button
                    variant={appMode === 'presets' ? 'accent' : 'secondary'}
                    size="sm"
                    className="w-full text-[10px]"
                    onClick={() => setAppMode('presets')}
                    title="Presets"
                  >
                    P
                  </Button>
                  <Button
                    variant={appMode === 'setlists' ? 'accent' : 'secondary'}
                    size="sm"
                    className="w-full text-[10px]"
                    onClick={() => setAppMode('setlists')}
                    title="Setlists"
                  >
                    S
                  </Button>
                </div>
              ) : (
                <>
                  <Button
                    variant="secondary"
                    size="lg"
                    onClick={() => setPerformanceMode(true)}
                  >
                    Performance Mode
                  </Button>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant={appMode === 'presets' ? 'accent' : 'secondary'}
                      onClick={() => setAppMode('presets')}
                    >
                      Presets
                    </Button>
                    <Button
                      variant={appMode === 'setlists' ? 'accent' : 'secondary'}
                      onClick={() => setAppMode('setlists')}
                    >
                      Setlists
                    </Button>
                  </div>

                  {appMode === 'presets' && (
                    <OptionPanel
                      currentPreset={currentPreset}
                      handleSendCurrentPreset={() =>
                        presetMode.handleSendCurrentPreset(currentPreset)
                      }
                      autoSend={presetMode.autoSend}
                      handleToggleAutoSend={presetMode.handleToggleAutoSend}
                      handleRetrieveCurrentPreset={presetMode.handleRetrieveCurrentPreset}
                      handleRetrievePresetSlot={presetMode.handleRetrievePresetSlot}
                      handleWritePresetSlot={(bank, slot) =>
                        presetMode.handleWritePresetSlot(currentPreset, bank, slot)
                      }
                    ></OptionPanel>
                  )}

                  {appMode === 'setlists' && (
                    <div className="p-2 rounded-lg bg-base-300 text-xs">
                      <div>Setlists: {setlistMode.setlistSummary.count}</div>
                      <div>Entries: {setlistMode.setlistSummary.entries}</div>
                    </div>
                  )}

                  <SettingsPanel></SettingsPanel>
                </>
              )}

              {!leftPanelCollapsed && statusMessage && (
                <div className="p-2 mt-auto text-xs rounded-md bg-base-300/70 text-base-content/80">
                  {statusMessage}
                </div>
              )}
            </div>

            {appMode === 'presets' && (
              <>
                <PresetList
                  handleSelectPreset={presetMode.handleSelectPreset}
                  currentPreset={currentPreset}
                ></PresetList>
                <PresetDetails
                  editMode={presetMode.editMode}
                  currentPreset={currentPreset}
                  onPresetUpdated={setCurrentPreset}
                  setShowDeleteModal={setShowDeleteModal}
                  setEditMode={presetMode.setEditMode}
                ></PresetDetails>
              </>
            )}

            {appMode === 'setlists' && (
              <SetlistsPage
                setlists={setlistMode.setlists}
                selectedSetlistId={setlistMode.selectedSetlistId}
                isBackingUp={setlistMode.isBackingUp}
                backupProgress={setlistMode.backupProgress}
                isRestoring={setlistMode.isRestoringSetlist}
                restoreProgress={setlistMode.restoreProgress}
                onSelectSetlist={setlistMode.setSelectedSetlistId}
                onCreateBackup={setlistMode.handleCreateBackup}
                onRestoreSetlistToSynth={setlistMode.handleRestoreSetlistToSynth}
                onDeleteSetlist={setlistMode.handleDeleteSetlist}
                onExportSetlist={setlistMode.handleExportSetlist}
                onImportSetlist={setlistMode.handleImportSetlist}
                onSaveEntryAsPreset={setlistMode.handleSaveSetlistEntryAsPreset}
                onSendEntryToSlot={setlistMode.handleSendSetlistEntryToSlot}
                onPreviewEntryInBuffer={setlistMode.handlePreviewSetlistEntryInBuffer}
              />
            )}
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

          <SaveDraftPresetModal
            isOpen={Boolean(presetMode.saveDraftPresetState)}
            matchingPresetName={presetMode.saveDraftPresetState?.matchingPreset?.name}
            name={presetMode.saveDraftName}
            author={presetMode.saveDraftAuthor}
            tags={presetMode.saveDraftTags}
            description={presetMode.saveDraftDescription}
            onNameChange={presetMode.setSaveDraftName}
            onAuthorChange={presetMode.setSaveDraftAuthor}
            onTagsChange={presetMode.setSaveDraftTags}
            onDescriptionChange={presetMode.setSaveDraftDescription}
            onCancel={presetMode.closeSaveDraftPresetModal}
            onSave={presetMode.handleSaveDraftPreset}
          />
        </>
      )}
    </main>
  )
}
