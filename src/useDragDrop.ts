import { getCurrentWebview } from '@tauri-apps/api/webview'
import { useEffect } from 'react'

const useDragDrop = (
  createPresetData: (name: string, data: Uint8Array) => Promise<any>,
  addPreset: (presetData: any) => Promise<void>,
  setRefreshPresets: React.Dispatch<React.SetStateAction<boolean>>,
) => {
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).__TAURI__) {
      // Tauri environment
      const setupTauriDragDrop = async () => {
        const unlisten = await getCurrentWebview().onDragDropEvent(
          async (event) => {
            if (event.payload.type === 'drop') {
              for (const path of event.payload.paths) {
                const response = await fetch(`file://${path}`)
                const arrayBuffer = await response.arrayBuffer()
                const sysexData = new Uint8Array(arrayBuffer)
                const presetData = await createPresetData(
                  path.split('/').pop() || '',
                  sysexData,
                )
                await addPreset(presetData)
                setRefreshPresets((prev) => !prev)
              }
            }
          },
        )
        return () => {
          unlisten()
        }
      }
      setupTauriDragDrop()
    } else {
      // Browser environment
      const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        for (const file of e.dataTransfer.files) {
          if (file && file.name.endsWith('.syx')) {
            const sysexData = new Uint8Array(await file.arrayBuffer())
            const presetData = await createPresetData(file.name, sysexData)
            await addPreset(presetData)
            setRefreshPresets((prev) => !prev)
          }
        }
      }

      const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault()
      }

      const handleFileSelect = async (
        e: React.ChangeEvent<HTMLInputElement>,
      ) => {
        const files = e.target.files
        if (files) {
          for (const file of files) {
            if (file && file.name.endsWith('.syx')) {
              const sysexData = new Uint8Array(await file.arrayBuffer())
              const presetData = await createPresetData(file.name, sysexData)
              await addPreset(presetData)
              setRefreshPresets((prev) => !prev)
            }
          }
        }
      }

      const dropArea = document.getElementById('drop-area')
      const fileInput = document.createElement('input')
      fileInput.type = 'file'
      fileInput.accept = '.syx'
      fileInput.multiple = true
      fileInput.style.display = 'none'
      fileInput.addEventListener(
        'change',
        handleFileSelect as unknown as EventListener,
      )

      if (dropArea) {
        dropArea.addEventListener(
          'drop',
          handleDrop as unknown as EventListener,
        )
        dropArea.addEventListener(
          'dragover',
          handleDragOver as unknown as EventListener,
        )
        dropArea.addEventListener('click', () => fileInput.click())
        document.body.appendChild(fileInput)
      }

      return () => {
        if (dropArea) {
          dropArea.removeEventListener(
            'drop',
            handleDrop as unknown as EventListener,
          )
          dropArea.removeEventListener(
            'dragover',
            handleDragOver as unknown as EventListener,
          )
          dropArea.removeEventListener('click', () => fileInput.click())
          document.body.removeChild(fileInput)
        }
      }
    }
  }, [createPresetData, addPreset, setRefreshPresets])
}
export default useDragDrop
