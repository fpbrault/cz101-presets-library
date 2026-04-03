import { useEffect } from 'react'
import { getCurrentWebview } from '@tauri-apps/api/webview'
import { createPresetData, addPreset } from './lib/presetManager'
import { useRefresh } from './RefreshContext'

const useDragDrop = () => {
  const { triggerRefresh } = useRefresh()

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).__TAURI__) {
      // Tauri environment
      console.log('Tauri environment')
      const setupTauriDragDrop = async () => {
        const unlisten = await getCurrentWebview().onDragDropEvent(
          async (event) => {
            if (event.payload.type === 'drop') {
              for (const path of event.payload.paths) {
                const response = await fetch(`file://${path}`)
                const arrayBuffer = await response.arrayBuffer()
                const sysexData = new Uint8Array(arrayBuffer)
                const presets = await createPresetData(
                  path.split('/').pop() || '',
                  sysexData,
                )
                for (const preset of presets) {
                  await addPreset(preset)
                }
                triggerRefresh()
              }
            }
          },
        )
        return () => {
          unlisten()
        }
      }
      setupTauriDragDrop()

      const handleFileSelect = async (
        e: React.ChangeEvent<HTMLInputElement>,
      ) => {
        const files = e.target.files
        if (files) {
          for (const file of files) {
            if (file && file.name.toLowerCase().endsWith('.syx')) {
              const sysexData = new Uint8Array(await file.arrayBuffer())
              const presets = await createPresetData(file.name, sysexData)
              for (const preset of presets) {
                await addPreset(preset)
              }
              triggerRefresh()
            }
          }
        }
      }

      const dropArea = document.getElementById('drop-area')
      const fileInput = document.createElement('input')
      fileInput.type = 'file'
      fileInput.accept = '.syx,.SYX'
      fileInput.multiple = true
      fileInput.style.display = 'none'
      fileInput.addEventListener(
        'change',
        handleFileSelect as unknown as EventListener,
      )

      if (dropArea && !dropArea.hasAttribute('data-listeners-attached')) {
        dropArea.addEventListener('click', () => {
          fileInput.click()
        })
        dropArea.setAttribute('data-listeners-attached', 'true')
        document.body.appendChild(fileInput)
      }
    } else {
      // Browser environment
      const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        for (const file of e.dataTransfer.files) {
          if (file && file.name.toLowerCase().endsWith('.syx')) {
            const sysexData = new Uint8Array(await file.arrayBuffer())
            const presets = await createPresetData(file.name, sysexData)

            for (const preset of presets) {
              await addPreset(preset)
            }
            triggerRefresh()
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
        console.log(files)
        if (files) {
          for (const file of files) {
            if (file && file.name.toLowerCase().endsWith('.syx')) {
              console.log(file)
              const sysexData = new Uint8Array(await file.arrayBuffer())
              const presets = await createPresetData(file.name, sysexData)
              for (const preset of presets) {
                await addPreset(preset)
              }
              triggerRefresh()
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

      if (dropArea && !dropArea.hasAttribute('data-listeners-attached')) {
        dropArea.addEventListener(
          'drop',
          handleDrop as unknown as EventListener,
        )
        dropArea.addEventListener(
          'dragover',
          handleDragOver as unknown as EventListener,
        )
        dropArea.addEventListener('click', () => {
          fileInput.click()
        })
        dropArea.setAttribute('data-listeners-attached', 'true')
        document.body.appendChild(fileInput)
      }
    }
  }, [triggerRefresh])
}

export default useDragDrop
