// src/PresetDetails.tsx
import React, { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { v4 as uuidv4 } from 'uuid'
import { Preset, updatePreset } from '@/lib/presetManager'
import { buf2hex } from '@/utils'
import Button from '@/components/Button'
import PatchParameterViewer from '@/components/PatchParameterViewer'

interface PresetFormData {
  name: string
  filename: string
  tags: string
  description: string
  author: string
  createdDate: string
  modifiedDate: string
}

interface PresetDetailsProps {
  currentPreset: Preset | null
  editMode: boolean
  onPresetUpdated: (preset: Preset) => void
  setEditMode: (editMode: boolean) => void
  setShowDeleteModal: (show: boolean) => void
}

const PresetDetails: React.FC<PresetDetailsProps> = ({
  currentPreset,
  editMode,
  onPresetUpdated,
  setEditMode,
  setShowDeleteModal,
}) => {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState<PresetFormData>({
    name: '',
    filename: '',
    tags: '',
    description: '',
    author: '',
    createdDate: '',
    modifiedDate: '',
  })

  useEffect(() => {
    if (!currentPreset) return

    setFormData({
      name: currentPreset.name,
      filename: currentPreset.filename,
      tags: currentPreset.tags.join(','),
      description: currentPreset.description || '',
      author: currentPreset.author || '',
      createdDate: currentPreset.createdDate,
      modifiedDate: currentPreset.modifiedDate,
    })
  }, [currentPreset])

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { id, value } = e.target
    setFormData((prevData) => ({ ...prevData, [id]: value }))
  }

  const handleSave = async () => {
    if (!currentPreset) return

    const updatedPreset = {
      ...currentPreset,
      ...formData,
      tags: formData.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
    }

    await updatePreset(updatedPreset)
    await queryClient.invalidateQueries({ queryKey: ['presets'] })
    onPresetUpdated(updatedPreset)
    setEditMode(false)
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

  return (
    <div
      className={
        'w-96 flex flex-col p-4 bg-base-200 h-full overflow-auto min-w-64' +
        (currentPreset ? ' block' : ' hidden')
      }
    >
      <div className="flex flex-col flex-grow gap-2">
        <div className="p-2 border rounded-lg border-base-content/10 bg-base-100/20">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="text-xs font-bold tracking-wider uppercase text-base-content/60">
              Preset Details
            </div>
            <div className="flex gap-2">
              {editMode ? (
                <>
                  <Button onClick={handleSave} variant="success" size="sm">
                    Save
                  </Button>
                  <Button onClick={handleCancel} variant="error" size="sm">
                    Cancel
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="primary"
                    onClick={() => setEditMode(true)}
                    size="sm"
                  >
                    Edit
                  </Button>
                  <Button
                    variant="error"
                    onClick={() => setShowDeleteModal(true)}
                    size="sm"
                  >
                    Delete
                  </Button>
                </>
              )}
            </div>
          </div>
          <div className="space-y-3">
            <div className="p-2 border rounded-md border-base-content/10 bg-base-200/30">
              <div className="text-[10px] uppercase tracking-wider text-base-content/40">
                Name
              </div>
              {editMode ? (
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Name"
                  className="w-full mt-1 input input-bordered input-sm"
                />
              ) : (
                <div className="mt-1 text-lg font-bold leading-tight break-words">
                  {formData.name || '-'}
                </div>
              )}
            </div>

            <div className="p-2 border rounded-md border-base-content/10 bg-base-200/30">
              <div className="text-[10px] uppercase tracking-wider text-base-content/40">
                Tags
              </div>
              {editMode ? (
                <input
                  type="text"
                  id="tags"
                  value={formData.tags}
                  onChange={handleInputChange}
                  placeholder="tag1, tag2"
                  className="w-full mt-1 input input-bordered input-sm"
                />
              ) : (
                <div className="flex flex-wrap gap-1 mt-1">
                  {currentPreset?.tags.length ? (
                    currentPreset.tags.map((tag: string) => (
                      <span
                        key={uuidv4()}
                        className="capitalize badge badge-primary badge-sm"
                      >
                        {tag.toLowerCase()}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs opacity-50">No tags</span>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-2">
              <div className="p-2 border rounded-md border-base-content/10 bg-base-200/30">
                <div className="text-[10px] uppercase tracking-wider text-base-content/40">
                  Author
                </div>
                {editMode ? (
                  <input
                    type="text"
                    id="author"
                    value={formData.author}
                    onChange={handleInputChange}
                    placeholder="Author"
                    className="w-full mt-1 input input-bordered input-sm"
                  />
                ) : (
                  <div className="mt-1 text-xs font-semibold break-words">
                    {formData.author || '-'}
                  </div>
                )}
              </div>
            </div>

            <div className="p-2 border rounded-md border-base-content/10 bg-base-200/30">
              <div className="text-[10px] uppercase tracking-wider text-base-content/40">
                Description
              </div>
              {editMode ? (
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Description"
                  className="w-full mt-1 textarea textarea-bordered textarea-sm min-h-20"
                ></textarea>
              ) : (
                <div className="mt-1 text-xs font-semibold whitespace-pre-wrap break-words">
                  {formData.description || '-'}
                </div>
              )}
            </div>

            <details className="p-2 border rounded-md border-base-content/10 bg-base-200/30">
              <summary className="text-[10px] font-bold uppercase tracking-wider cursor-pointer text-base-content/60">
                Additional Data
              </summary>
              <div className="grid grid-cols-1 gap-2 mt-2">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-base-content/40">
                    ID
                  </div>
                  <div className="mt-1 text-xs font-mono font-semibold break-all">
                    {currentPreset?.id || '-'}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-base-content/40">
                    Filename
                  </div>
                  <div className="mt-1 text-xs font-mono font-semibold break-all">
                    {formData.filename || '-'}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-base-content/40">
                    Created
                  </div>
                  <div className="mt-1 text-xs font-mono font-semibold break-all">
                    {formData.createdDate || '-'}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-base-content/40">
                    Modified
                  </div>
                  <div className="mt-1 text-xs font-mono font-semibold break-all">
                    {formData.modifiedDate || '-'}
                  </div>
                </div>
              </div>
            </details>

            <details className="p-2 border rounded-md border-base-content/10 bg-base-200/30">
              <summary className="text-[10px] font-bold uppercase tracking-wider cursor-pointer text-base-content/60">
                Raw SysEx Data
              </summary>
              <div className="mt-2 max-h-40 overflow-auto text-[10px] font-mono font-semibold whitespace-pre-wrap break-all opacity-80">
                {buf2hex(currentPreset?.sysexData || [])}
              </div>
            </details>
          </div>
        </div>
        {currentPreset?.sysexData && (
          <div className="p-2 border rounded-lg border-base-content/10 bg-base-100/20">
            <div className="mb-2 text-xs font-bold tracking-wider uppercase text-base-content/60">
              Patch Parameters
            </div>
            <PatchParameterViewer sysexData={currentPreset.sysexData} />
          </div>
        )}
      </div>
    </div>
  )
}

export default PresetDetails
