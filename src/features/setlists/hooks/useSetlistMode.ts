import { useEffect, useMemo, useState } from 'react'
import {
  createSetlist,
  deleteSetlist,
  exportSetlist,
  getSetlists,
  importSetlist,
  Setlist,
} from '@/lib/setlistManager'
import {
  getMatchingPresetBySysex,
  retrieveInternalBackupFromSynth,
  writeSysexDataToSynthSlot,
  writeSysexDataToTemporaryBuffer,
} from '@/lib/presetManager'
import { save } from '@tauri-apps/plugin-dialog'
import { writeTextFile } from '@tauri-apps/plugin-fs'

type AppMode = 'presets' | 'setlists'

interface UseSetlistModeParams {
  selectedMidiPort: string
  selectedMidiChannel: number
  setStatusMessage: (message: string) => void
  setAppMode: (mode: AppMode) => void
  openSaveDraftPresetModal: (
    sysexData: Uint8Array,
    matchingPresetName: Awaited<ReturnType<typeof getMatchingPresetBySysex>>,
    suggestedName: string,
  ) => void
}

export function useSetlistMode({
  selectedMidiPort,
  selectedMidiChannel,
  setStatusMessage,
  setAppMode,
  openSaveDraftPresetModal,
}: UseSetlistModeParams) {
  const [setlists, setSetlists] = useState<Setlist[]>([])
  const [selectedSetlistId, setSelectedSetlistId] = useState<string | null>(null)
  const [backupProgress, setBackupProgress] = useState<{
    completed: number
    total: number
  } | null>(null)
  const [isBackingUp, setIsBackingUp] = useState(false)
  const [isRestoringSetlist, setIsRestoringSetlist] = useState(false)
  const [restoreProgress, setRestoreProgress] = useState<{
    completed: number
    total: number
    attempts: number
  } | null>(null)

  const refreshSetlists = () => {
    const nextSetlists = getSetlists()
    setSetlists(nextSetlists)
    if (
      selectedSetlistId &&
      !nextSetlists.some((setlist) => setlist.id === selectedSetlistId)
    ) {
      setSelectedSetlistId(nextSetlists[0]?.id ?? null)
    }
    if (!selectedSetlistId && nextSetlists.length > 0) {
      setSelectedSetlistId(nextSetlists[0].id)
    }
  }

  useEffect(() => {
    refreshSetlists()

    const handleSetlistsUpdated = () => {
      refreshSetlists()
    }

    window.addEventListener('setlists-updated', handleSetlistsUpdated)

    return () => {
      window.removeEventListener('setlists-updated', handleSetlistsUpdated)
    }
  }, [])

  const handleCreateBackup = async () => {
    if (!selectedMidiPort) {
      setStatusMessage('Select a MIDI port before creating backup setlists.')
      return
    }

    try {
      setIsBackingUp(true)
      setBackupProgress({ completed: 0, total: 16 })

      const entries = await retrieveInternalBackupFromSynth(
        selectedMidiPort,
        selectedMidiChannel,
        (completed, total) => {
          setBackupProgress({ completed, total })
        },
      )

      const setlist = createSetlist({
        name: `Internal Backup ${new Date().toLocaleString()}`,
        source: 'internal-16',
        entries,
      })

      refreshSetlists()
      setSelectedSetlistId(setlist.id)
      setAppMode('setlists')

      const exactMatchCount = entries.filter((entry) => entry.isExactLibraryMatch).length
      setStatusMessage(
        `Backup complete: ${entries.length}/16 slots retrieved, ${exactMatchCount} exact library matches.`,
      )
    } catch (error) {
      setStatusMessage((error as Error).message)
    } finally {
      setIsBackingUp(false)
      setBackupProgress(null)
    }
  }

  const handleDeleteSetlist = (setlistId: string) => {
    deleteSetlist(setlistId)
    refreshSetlists()
  }

  const handleExportSetlist = async (setlistId: string) => {
    const json = exportSetlist(setlistId)

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
        await writeTextFile(filePath, json)
      }
      return
    }

    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'setlist-backup.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImportSetlist = async (file: File) => {
    const json = await file.text()
    const importedSetlist = importSetlist(json)
    refreshSetlists()
    setSelectedSetlistId(importedSetlist.id)
    setAppMode('setlists')
    setStatusMessage(`Imported setlist ${importedSetlist.name}.`)
  }

  const handleSaveSetlistEntryAsPreset = async (
    setlistId: string,
    entryIndex: number,
  ) => {
    const setlist = setlists.find((item) => item.id === setlistId)
    const entry = setlist?.entries[entryIndex]

    if (!entry) {
      setStatusMessage('Setlist entry not found.')
      return
    }

    const matchingPreset = await getMatchingPresetBySysex(entry.sysexData)
    openSaveDraftPresetModal(
      entry.sysexData,
      matchingPreset,
      `setlist-${setlist?.name || 'entry'}-${entry.slot}`,
    )
    setStatusMessage('Prepared setlist entry as a new preset draft.')
  }

  const handleSendSetlistEntryToSlot = async (
    setlistId: string,
    entryIndex: number,
    bank: 'internal' | 'cartridge',
    slot: number,
  ) => {
    if (!selectedMidiPort) {
      setStatusMessage('Select a MIDI port before sending setlist entries.')
      return
    }

    const setlist = setlists.find((item) => item.id === setlistId)
    const entry = setlist?.entries[entryIndex]

    if (!entry) {
      setStatusMessage('Setlist entry not found.')
      return
    }

    await writeSysexDataToSynthSlot(
      entry.sysexData,
      selectedMidiPort,
      selectedMidiChannel,
      bank,
      slot,
    )

    setStatusMessage(
      `Sent setlist entry ${entry.slot} to ${bank} slot ${slot}.`,
    )
  }

  const handlePreviewSetlistEntryInBuffer = async (
    setlistId: string,
    entryIndex: number,
  ) => {
    if (!selectedMidiPort) {
      setStatusMessage('Select a MIDI port before previewing setlist entries.')
      return
    }

    const setlist = setlists.find((item) => item.id === setlistId)
    const entry = setlist?.entries[entryIndex]

    if (!entry) {
      setStatusMessage('Setlist entry not found.')
      return
    }

    await writeSysexDataToTemporaryBuffer(
      entry.sysexData,
      selectedMidiPort,
      selectedMidiChannel,
    )

    setStatusMessage(
      `Previewed setlist entry ${entry.slot} in temporary buffer (slot 0x60).`,
    )
  }

  const handleRestoreSetlistToSynth = async (
    setlistId: string,
    bank: 'internal' | 'cartridge',
  ) => {
    if (!selectedMidiPort) {
      setStatusMessage('Select a MIDI port before restoring setlists.')
      return
    }

    const setlist = setlists.find((item) => item.id === setlistId)
    if (!setlist) {
      setStatusMessage('Setlist not found.')
      return
    }

    const maxAttemptsPerSlot = 3
    let attempts = 0

    try {
      setIsRestoringSetlist(true)
      setRestoreProgress({
        completed: 0,
        total: setlist.entries.length,
        attempts: 0,
      })

      for (let i = 0; i < setlist.entries.length; i++) {
        const entry = setlist.entries[i]
        let success = false
        let lastError: unknown

        for (let attempt = 1; attempt <= maxAttemptsPerSlot; attempt++) {
          attempts += 1
          setRestoreProgress({
            completed: i,
            total: setlist.entries.length,
            attempts,
          })

          try {
            await writeSysexDataToSynthSlot(
              entry.sysexData,
              selectedMidiPort,
              selectedMidiChannel,
              bank,
              entry.slot,
            )
            success = true
            break
          } catch (error) {
            lastError = error
            if (attempt < maxAttemptsPerSlot) {
              await new Promise((resolve) => setTimeout(resolve, 180))
            }
          }
        }

        if (!success) {
          throw new Error(
            `Failed restoring slot ${entry.slot} after ${maxAttemptsPerSlot} attempts: ${(lastError as Error)?.message || 'unknown error'}`,
          )
        }

        setRestoreProgress({
          completed: i + 1,
          total: setlist.entries.length,
          attempts,
        })
      }

      setStatusMessage(
        `Restore complete: ${setlist.entries.length}/${setlist.entries.length} entries sent to ${bank} slots.`,
      )
    } catch (error) {
      setStatusMessage((error as Error).message)
    } finally {
      setIsRestoringSetlist(false)
      setRestoreProgress(null)
    }
  }

  const setlistSummary = useMemo(() => {
    return setlists.reduce(
      (acc, setlist) => {
        acc.count += 1
        acc.entries += setlist.entries.length
        return acc
      },
      { count: 0, entries: 0 },
    )
  }, [setlists])

  return {
    setlists,
    selectedSetlistId,
    setSelectedSetlistId,
    isBackingUp,
    backupProgress,
    isRestoringSetlist,
    restoreProgress,
    setlistSummary,
    handleCreateBackup,
    handleDeleteSetlist,
    handleExportSetlist,
    handleImportSetlist,
    handleSaveSetlistEntryAsPreset,
    handleSendSetlistEntryToSlot,
    handlePreviewSetlistEntryInBuffer,
    handleRestoreSetlistToSynth,
  }
}
