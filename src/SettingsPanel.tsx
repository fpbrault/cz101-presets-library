import React, { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { FaCog } from 'react-icons/fa'
import {
  addFactoryPresetsToLibrary,
  cloudBackupPresets,
  cloudRestorePresets,
  exportPresets,
  importPresets,
} from '@/lib/presetManager'
import {
  exportWorkspaceBackup,
  importWorkspaceBackup,
  isWorkspaceBackupEnvelope,
} from '@/lib/workspaceBackup'
import {
  loadOnlineSyncSettings,
  saveOnlineSyncSettings,
} from '@/lib/onlineSyncSettings'
import { configurePresetSyncAdapterFromSettings } from '@/lib/remotePresetSyncAdapter'
import {
  disconnectOnlineSession,
  loadOnlineAuthSession,
  refreshOnlineAuthSession,
  startOnlineProviderSignIn,
} from '@/lib/onlineAuthSession'
import { getNeonAuthDiagnostics } from '@/lib/neonAuthClient'

import { writeTextFile } from '@tauri-apps/plugin-fs'
import { save } from '@tauri-apps/plugin-dialog'
import Button from '@/components/Button'
import FileInput from '@/components/FileInput'
import InlineNotice from '@/components/InlineNotice'

const SettingsPanel: React.FC = () => {
  const queryClient = useQueryClient()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [onlineSyncSettings, setOnlineSyncSettings] = useState(
    loadOnlineSyncSettings(),
  )
  const [onlineAuthSession, setOnlineAuthSession] = useState(
    loadOnlineAuthSession(),
  )
  const [syncStatusMessage, setSyncStatusMessage] = useState('')
  const [authDiagnostics, setAuthDiagnostics] = useState(getNeonAuthDiagnostics())

  const handleOpenModal = () => {
    const loaded = loadOnlineSyncSettings()
    const loadedSession = loadOnlineAuthSession()
    setOnlineSyncSettings(loaded)
    setOnlineAuthSession(loadedSession)
    setAuthDiagnostics(getNeonAuthDiagnostics())
    setSyncStatusMessage('')
    setIsModalOpen(true)
  }
  const handleCloseModal = () => setIsModalOpen(false)

  const handleExport = async () => {
    const data = await exportPresets()
    if ((window as any).__TAURI__) {
      // Tauri environment
      const filePath = await save({
        filters: [
          {
            name: 'JSON',
            extensions: ['json'],
          },
        ],
      })
      if (filePath) {
        await writeTextFile(filePath, data)
      }
    } else {
      // Browser environment
      const blob = new Blob([data], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'presets.json'
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const data = await file.text()
      try {
        const parsed = JSON.parse(data)
        if (isWorkspaceBackupEnvelope(parsed)) {
          await importWorkspaceBackup(data)
        } else {
          await importPresets(data)
        }
      } catch (error) {
        console.error('Failed to import JSON file:', error)
        return
      }
      handleCloseModal()
      await queryClient.invalidateQueries({ queryKey: ['presets'] })
    }
  }

  const handleExportWorkspace = async () => {
    const data = await exportWorkspaceBackup()
    if ((window as any).__TAURI__) {
      const filePath = await save({
        filters: [
          {
            name: 'JSON',
            extensions: ['json'],
          },
        ],
      })
      if (filePath) {
        await writeTextFile(filePath, data)
      }
    } else {
      const blob = new Blob([data], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'workspace-backup.json'
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  const handleAddFactoryPresets = () => {
    void (async () => {
      try {
        const addedCount = await addFactoryPresetsToLibrary()
        await queryClient.invalidateQueries({ queryKey: ['presets'] })
        setSyncStatusMessage(
          addedCount > 0
            ? `Added ${addedCount} factory preset(s).`
            : 'Factory presets are already in your library.',
        )
      } catch (error) {
        setSyncStatusMessage((error as Error).message)
      }
    })()
  }

  const handleEnableOnlineSync = async () => {
    const session = loadOnlineAuthSession()
    if (!session?.userId) {
      setSyncStatusMessage(
        'Sign in with Google or Apple first to enable online sync.',
      )
      return
    }

    const nextSettings = { enabled: true }
    saveOnlineSyncSettings(nextSettings)
    setOnlineSyncSettings(nextSettings)
    setOnlineAuthSession(session)
    configurePresetSyncAdapterFromSettings()
    setSyncStatusMessage('Online sync enabled.')
  }

  const handleDisableOnlineSync = () => {
    const nextSettings = {
      enabled: false,
    }

    saveOnlineSyncSettings(nextSettings)
    setOnlineSyncSettings(nextSettings)
    configurePresetSyncAdapterFromSettings()
    setSyncStatusMessage('Online sync disabled. App continues in local-only mode.')
  }

  const handleBackupNow = () => {
    void (async () => {
      try {
        const ok = await cloudBackupPresets()
        setSyncStatusMessage(ok ? 'Backup saved to cloud.' : 'Backup failed — check connection.')
      } catch (error) {
        setSyncStatusMessage((error as Error).message)
      }
    })()
  }

  const handleRestoreFromBackup = () => {
    void (async () => {
      try {
        const count = await cloudRestorePresets()
        if (count === null) {
          setSyncStatusMessage('No backup found in the cloud.')
        } else {
          await queryClient.invalidateQueries({ queryKey: ['presets'] })
          handleCloseModal()
        }
      } catch (error) {
        setSyncStatusMessage((error as Error).message)
      }
    })()
  }

  const handleSignIn = (provider: 'google' | 'apple') => {
    void (async () => {
      try {
        await startOnlineProviderSignIn(provider)
      } catch (error) {
        setSyncStatusMessage((error as Error).message)
      }
    })()
  }

  const handleRefreshSession = () => {
    void (async () => {
      const nextSession = await refreshOnlineAuthSession()
      setOnlineAuthSession(nextSession)
      setSyncStatusMessage(
        nextSession
          ? `Connected as ${nextSession.displayName || nextSession.userId}.`
          : 'No online session detected.',
      )
    })()
  }

  const handleDisconnectAccount = () => {
    void (async () => {
      await disconnectOnlineSession()
      const nextSettings = { enabled: false }
      saveOnlineSyncSettings(nextSettings)
      setOnlineSyncSettings(nextSettings)
      setOnlineAuthSession(null)
      configurePresetSyncAdapterFromSettings()
      setSyncStatusMessage('Disconnected account. Local-only mode enabled.')
    })()
  }

  return (
    <>
      <Button onClick={handleOpenModal} variant="secondary">
        <FaCog size={16} /> Settings
      </Button>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="p-4 shadow-lg bg-base-100 rounded-xl">
            <h2 className="mb-4 text-xl">Settings</h2>
            <div className="flex flex-col justify-end gap-2 mt-4">
              <label className="w-full max-w-xs form-control">
                <div className="label">
                  <span className="label-text">Export Full Workspace Backup</span>
                </div>
                <Button onClick={handleExportWorkspace} variant="accent">
                  Export Full Backup
                </Button>
              </label>
              <label className="w-full max-w-xs form-control">
                <div className="label">
                  <span className="label-text">Export Database</span>
                </div>
                <Button onClick={handleExport} variant="primary">
                  Export
                </Button>
              </label>
              <label className="w-full max-w-xs form-control">
                <div className="label">
                  <span className="label-text">Import Database</span>
                </div>
                <FileInput
                  accept="application/json"
                  onChange={handleImport}
                  tone="secondary"
                />
              </label>

              <label className="w-full max-w-xs form-control">
                <div className="label">
                  <span className="label-text">Factory Preset Library</span>
                </div>
                <Button onClick={handleAddFactoryPresets} variant="neutral">
                  Add Factory Presets
                </Button>
              </label>

              <div className="w-full max-w-xs p-3 border rounded-lg border-base-content/15 bg-base-200/50">
                <div className="mb-2 font-semibold">Online Sync (Optional)</div>
                <div className="mb-3 text-xs opacity-80">
                  Default is local-only. Sign in with a provider to optionally enable sync.
                </div>

                <div className="flex flex-wrap gap-2 mb-2">
                  <Button variant="primary" onClick={() => handleSignIn('google')}>
                    Continue With Google
                  </Button>
                  <Button variant="neutral" onClick={() => handleSignIn('apple')}>
                    Continue With Apple
                  </Button>
                  <Button variant="secondary" onClick={handleRefreshSession}>
                    Refresh Session
                  </Button>
                </div>

                <Button variant="error" onClick={handleDisconnectAccount}>
                  Disconnect Account
                </Button>

                <div className="flex gap-2">
                  <Button
                    variant="accent"
                    onClick={handleEnableOnlineSync}
                    disabled={onlineSyncSettings.enabled || !onlineAuthSession}
                  >
                    Enable Sync
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={handleDisableOnlineSync}
                    disabled={!onlineSyncSettings.enabled}
                  >
                    Use Local Only
                  </Button>
                </div>

                <div className="mt-2 text-xs opacity-80">
                  Status: {onlineSyncSettings.enabled ? 'Enabled' : 'Local-only'}
                </div>
                <div className="text-xs opacity-80">
                  Account:{' '}
                  {onlineAuthSession
                    ? `${onlineAuthSession.displayName || onlineAuthSession.userId} (${onlineAuthSession.provider})`
                    : 'Not connected'}
                </div>

                {onlineSyncSettings.enabled && (
                  <div className="flex gap-2 mt-2">
                    <Button variant="primary" onClick={handleBackupNow}>
                      Backup Now
                    </Button>
                    <Button variant="secondary" onClick={handleRestoreFromBackup}>
                      Restore from Backup
                    </Button>
                  </div>
                )}
                <div className="mt-1 text-[11px] opacity-80">
                  Neon Auth URL: {authDiagnostics.normalizedUrl || '(missing)'}
                </div>
                <div className="text-[11px] opacity-80">
                  URL Valid: {authDiagnostics.isAbsoluteUrl ? 'yes' : 'no'}
                </div>
                {authDiagnostics.error && (
                  <InlineNotice
                    message={authDiagnostics.error}
                    tone="warning"
                    className="mt-2"
                  />
                )}
                {syncStatusMessage && (
                  <InlineNotice
                    message={syncStatusMessage}
                    tone={onlineSyncSettings.enabled ? 'info' : 'neutral'}
                    className="mt-2"
                  />
                )}
              </div>

              <Button variant="error" onClick={handleCloseModal}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default SettingsPanel
