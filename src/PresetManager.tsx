import { useState } from 'react'
import { Preset } from '@/lib/presetManager'
import PresetDetails from '@/PresetDetails'
import PresetList from '@/PresetList'
import OptionPanel from '@/features/presets/components/OptionPanel'
import SettingsPanel from '@/SettingsPanel'
import { useMidiChannel } from '@/MidiChannelContext'
import { useMidiPort } from '@/MidiPortContext'
import PerformanceMode from '@/PerformanceMode'
import Button from '@/components/Button'
import InlineNotice from '@/components/InlineNotice'
import { useMidiSetup } from '@/useMidiSetup'
import SynthBackupsPage from '@/features/synthBackups/components/SynthBackupsPage'
import SetlistsPage from '@/features/setlists/components/SetlistsPage'
import SaveDraftPresetModal from '@/features/presets/components/SaveDraftPresetModal'
import { usePresetMode } from '@/features/presets/hooks/usePresetMode'
import { useSynthBackupMode } from '@/features/synthBackups/hooks/useSynthBackupMode'
import { useSetlistMode } from '@/features/setlists/hooks/useSetlistMode'
import { useSearchFilter } from '@/SearchFilterContext'

type AppMode = 'presets' | 'synthBackups' | 'setlists'

export default function PresetManager() {
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(true)
  const [performanceMode, setPerformanceMode] = useState(false)
  const [currentPreset, setCurrentPreset] = useState<Preset | null>(null)
  const [appMode, setAppMode] = useState<AppMode>('presets')
  const [statusMessage, setStatusMessage] = useState<string>('')

  const { setMidiPorts, selectedMidiPort } = useMidiPort()
  const { selectedMidiChannel } = useMidiChannel()
  const { activePlaylistId, setActivePlaylistId } = useSearchFilter()

  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [dragOverPlaylistId, setDragOverPlaylistId] = useState<string | null>(null)

  useMidiSetup(setMidiPorts)

  const presetMode = usePresetMode({
    selectedMidiPort,
    selectedMidiChannel,
    setStatusMessage,
    setCurrentPreset,
    setAppMode,
  })

  const synthBackupMode = useSynthBackupMode({
    selectedMidiPort,
    selectedMidiChannel,
    setStatusMessage,
    setAppMode,
    openSaveDraftPresetModal: presetMode.openSaveDraftPresetModal,
  })

  const setlistMode = useSetlistMode({
    selectedMidiPort,
    selectedMidiChannel,
    setStatusMessage,
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
                    variant={appMode === 'synthBackups' ? 'accent' : 'secondary'}
                    size="sm"
                    className="w-full text-[10px]"
                    onClick={() => setAppMode('synthBackups')}
                    title="Synth Backups"
                  >
                    B
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
                  <div className="grid grid-cols-1 gap-2">
                    <Button
                      variant={appMode === 'presets' ? 'accent' : 'secondary'}
                      onClick={() => setAppMode('presets')}
                    >
                      Presets
                    </Button>
                    <Button
                      variant={appMode === 'synthBackups' ? 'accent' : 'secondary'}
                      onClick={() => setAppMode('synthBackups')}
                    >
                      Synth Backups
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

                  {appMode === 'presets' && setlistMode.playlists.length > 0 && (
                    <div className="p-2 rounded-lg bg-base-300 text-xs overflow-y-auto max-h-48">
                      <div className="font-bold mb-1 opacity-70 uppercase tracking-wide">Setlists</div>
                      <button
                        className={`w-full text-left px-2 py-1 rounded transition-colors ${
                          !activePlaylistId
                            ? 'bg-accent text-accent-content font-semibold'
                            : 'hover:bg-base-200'
                        }`}
                        onClick={() => setActivePlaylistId(null)}
                      >
                        All Presets
                      </button>
                      {setlistMode.playlists.map((playlist) => (
                        <button
                          key={playlist.id}
                          className={`w-full text-left px-2 py-1 rounded transition-colors truncate ${
                            activePlaylistId === playlist.id
                              ? 'bg-accent text-accent-content font-semibold'
                              : dragOverPlaylistId === playlist.id
                              ? 'bg-success/30 ring-1 ring-success'
                              : 'hover:bg-base-200'
                          }`}
                          onClick={() => setActivePlaylistId(playlist.id)}
                          title={playlist.name}
                          onDragOver={(e) => {
                            e.preventDefault()
                            e.dataTransfer.dropEffect = 'copy'
                            setDragOverPlaylistId(playlist.id)
                          }}
                          onDragLeave={() => setDragOverPlaylistId(null)}
                          onDrop={(e) => {
                            e.preventDefault()
                            setDragOverPlaylistId(null)
                            const presetId = e.dataTransfer.getData('text/preset-id')
                            if (presetId) {
                              setlistMode.handleAddPreset(playlist.id, presetId)
                            }
                          }}
                        >
                          {playlist.name}
                          <span className="ml-1 opacity-60">({playlist.entries.length})</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {appMode === 'synthBackups' && (
                    <div className="p-2 rounded-lg bg-base-300 text-xs">
                      <div>Backups: {synthBackupMode.backupSummary.count}</div>
                      <div>Entries: {synthBackupMode.backupSummary.entries}</div>
                    </div>
                  )}

                  {appMode === 'setlists' && (
                    <div className="p-2 rounded-lg bg-base-300 text-xs">
                      <div>Setlists: {setlistMode.playlists.length}</div>
                    </div>
                  )}

                  <SettingsPanel></SettingsPanel>
                </>
              )}

              {!leftPanelCollapsed && statusMessage && (
                <InlineNotice
                  message={statusMessage}
                  tone="info"
                  className="mt-auto"
                />
              )}
            </div>

            {appMode === 'presets' && (
              <>
                <PresetList
                  handleSelectPreset={presetMode.handleSelectPreset}
                  handleActivatePreset={presetMode.handleActivatePreset}
                  currentPreset={currentPreset}
                  playlists={setlistMode.playlists}
                  onAddPresetToPlaylist={setlistMode.handleAddPreset}
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

            {appMode === 'synthBackups' && (
              <SynthBackupsPage
                backups={synthBackupMode.backups}
                selectedBackupId={synthBackupMode.selectedBackupId}
                isBackingUp={synthBackupMode.isBackingUp}
                backupProgress={synthBackupMode.backupProgress}
                isRestoring={synthBackupMode.isRestoringBackup}
                restoreProgress={synthBackupMode.restoreProgress}
                onSelectBackup={synthBackupMode.setSelectedBackupId}
                onCreateBackup={synthBackupMode.handleCreateBackup}
                onRestoreBackupToSynth={synthBackupMode.handleRestoreBackupToSynth}
                onDeleteBackup={synthBackupMode.handleDeleteBackup}
                onExportBackup={synthBackupMode.handleExportBackup}
                onImportBackup={synthBackupMode.handleImportBackup}
                onSaveEntryAsPreset={synthBackupMode.handleSaveBackupEntryAsPreset}
                onSendEntryToSlot={synthBackupMode.handleSendBackupEntryToSlot}
                onPreviewEntryInBuffer={synthBackupMode.handlePreviewBackupEntryInBuffer}
              />
            )}

            {appMode === 'setlists' && (
              <SetlistsPage
                playlists={setlistMode.playlists}
                selectedPlaylistId={setlistMode.selectedPlaylistId}
                presets={setlistMode.presets}
                quickSendIndex={setlistMode.quickSendIndex}
                isQuickSending={setlistMode.isQuickSending}
                onSelectPlaylist={setlistMode.setSelectedPlaylistId}
                onCreatePlaylist={setlistMode.handleCreatePlaylist}
                onRenamePlaylist={setlistMode.handleRenamePlaylist}
                onDeletePlaylist={setlistMode.handleDeletePlaylist}
                onAddPreset={setlistMode.handleAddPreset}
                onRemoveEntry={setlistMode.handleRemoveEntry}
                onReorderEntries={setlistMode.handleReorderEntries}
                onStartQuickSend={setlistMode.handleStartQuickSend}
                onStepQuickSend={setlistMode.handleStepQuickSend}
                onStopQuickSend={setlistMode.handleStopQuickSend}
                onSendCurrentToBuffer={setlistMode.handleSendCurrentToBuffer}
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
