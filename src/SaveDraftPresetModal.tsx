import Button from '@/components/Button'

interface SaveDraftPresetModalProps {
  isOpen: boolean
  matchingPresetName?: string
  name: string
  author: string
  tags: string
  description: string
  onNameChange: (value: string) => void
  onAuthorChange: (value: string) => void
  onTagsChange: (value: string) => void
  onDescriptionChange: (value: string) => void
  onCancel: () => void
  onSave: () => void
}

export default function SaveDraftPresetModal({
  isOpen,
  matchingPresetName,
  name,
  author,
  tags,
  description,
  onNameChange,
  onAuthorChange,
  onTagsChange,
  onDescriptionChange,
  onCancel,
  onSave,
}: SaveDraftPresetModalProps) {
  if (!isOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
      <div className="w-full max-w-2xl p-4 shadow-2xl bg-base-100 rounded-xl">
        <h2 className="mb-3 text-xl font-bold">Save Retrieved Preset</h2>

        {matchingPresetName && (
          <div className="p-2 mb-3 text-sm rounded-md bg-success/20 border border-success/40">
            Exact library match found: {matchingPresetName}
          </div>
        )}

        <div className="grid grid-cols-1 gap-3">
          <label className="form-control">
            <span className="label-text">Name</span>
            <input
              className="input input-bordered"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
            />
          </label>

          <label className="form-control">
            <span className="label-text">Author</span>
            <input
              className="input input-bordered"
              value={author}
              onChange={(e) => onAuthorChange(e.target.value)}
            />
          </label>

          <label className="form-control">
            <span className="label-text">Tags (comma-separated)</span>
            <input
              className="input input-bordered"
              value={tags}
              onChange={(e) => onTagsChange(e.target.value)}
            />
          </label>

          <label className="form-control">
            <span className="label-text">Description</span>
            <textarea
              className="textarea textarea-bordered"
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
            />
          </label>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="primary" onClick={onSave}>
            Save New Preset
          </Button>
        </div>
      </div>
    </div>
  )
}
