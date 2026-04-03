import React, { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { FaCog } from 'react-icons/fa'
import { exportPresets, importPresets } from '@/lib/presetManager'

import { writeTextFile } from '@tauri-apps/plugin-fs'
import { save } from '@tauri-apps/plugin-dialog'
import Button from '@/components/Button'

const SettingsPanel: React.FC = () => {
  const queryClient = useQueryClient()
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleOpenModal = () => setIsModalOpen(true)
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
      await importPresets(data)
      handleCloseModal()
      await queryClient.invalidateQueries({ queryKey: ['presets'] })
    }
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
                <input
                  type="file"
                  accept="application/json"
                  onChange={handleImport}
                  placeholder="Import Database"
                  className="w-full max-w-xs file-input file-input-bordered file-input-secondary"
                />
              </label>
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
