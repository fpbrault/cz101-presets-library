// src/PresetDetails.tsx
import React, { useEffect, useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { Preset, updatePreset } from '@/lib/presetManager'
import { buf2hex } from '@/utils'
import Button from '@/components/Button'

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
      <h2>Preset Details</h2>
      <div className="flex gap-2">
        {editMode ? (
          <>
            <Button onClick={handleSave} variant="success">
              Save
            </Button>
            <Button onClick={handleCancel} variant="error">
              Cancel
            </Button>
          </>
        ) : (
          <>
            <Button variant="primary" onClick={() => setEditMode(true)}>
              Edit
            </Button>
            <Button variant="error" onClick={() => setShowDeleteModal(true)}>
              Delete
            </Button>
          </>
        )}
      </div>
      <div className="flex flex-col flex-grow">
        {[
          {
            label: 'ID',
            id: 'id',
            value: currentPreset?.id || '',
            type: 'text',
          },
          {
            label: 'Name',
            id: 'name',
            value: formData.name,
            type: 'text',
          },
          {
            label: 'Filename',
            id: 'filename',
            value: formData.filename,
            type: 'text',
          },
          {
            label: 'Tags',
            id: 'tags',
            value: formData.tags,
            type: 'text',
          },
          {
            label: 'Description',
            id: 'description',
            value: formData.description,
            type: 'textarea',
          },
          {
            label: 'Author',
            id: 'author',
            value: formData.author,
            type: 'text',
          },
          {
            label: 'Created Date',
            id: 'createdDate',
            value: formData.createdDate,
            type: 'text',
          },
          {
            label: 'Modified Date',
            id: 'modifiedDate',
            value: formData.modifiedDate,
            type: 'text',
          },
          {
            label: 'Slot',
            id: 'slot',
            value: currentPreset?.slot || '',
            type: 'text',
          },
          {
            label: 'Sysex Data',
            id: 'sysexData',
            value: buf2hex(currentPreset?.sysexData || []),
            type: 'textarea',
          },
        ].map((item, index) => (
          <label key={index} className="w-full max-w-xs form-control">
            <div className="label">
              <span className="label-text">{item.label}</span>
            </div>
            {editMode &&
            !['filename', 'createdDate', 'modifiedDate', 'sysexData'].includes(
              item.id,
            ) ? (
              item.type === 'textarea' ? (
                <textarea
                  id={item.id}
                  value={item.value}
                  onChange={handleInputChange}
                  placeholder={`${item.label}`}
                  className="w-full max-w-xs textarea textarea-bordered textarea-sm"
                ></textarea>
              ) : (
                <input
                  type={item.type}
                  id={item.id}
                  value={item.value}
                  onChange={handleInputChange}
                  placeholder={`${item.label}`}
                  className="w-full max-w-xs input input-bordered input-sm"
                />
              )
            ) : (
              <div className="flex flex-wrap gap-2 ml-4 overflow-auto font-bold break-word max-h-36">
                {item.id === 'tags'
                  ? currentPreset?.tags.map((tag: string) => (
                      <span
                        key={uuidv4()}
                        className="capitalize badge badge-primary"
                      >
                        {tag.toLowerCase()}
                      </span>
                    ))
                  : item.value}
              </div>
            )}
          </label>
        ))}
      </div>
    </div>
  )
}

export default PresetDetails
