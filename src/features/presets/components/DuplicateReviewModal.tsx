import { useMemo, useState } from 'react'
import Button from '@/components/Button'
import ModalShell from '@/components/ModalShell'
import { Preset } from '@/lib/presets/presetManager'

export interface DuplicateGroup {
  fingerprint: string
  presets: Preset[]
}

function getSuggestedKeepIndex(presets: Preset[]): number {
  const favoriteIndex = presets.findIndex((preset) => Boolean(preset.favorite))
  return favoriteIndex >= 0 ? favoriteIndex : 0
}

interface DuplicateReviewModalProps {
  isOpen: boolean
  groups: DuplicateGroup[]
  onClose: () => void
  onDeletePresets: (ids: string[]) => Promise<void>
}

export default function DuplicateReviewModal({
  isOpen,
  groups,
  onClose,
  onDeletePresets,
}: DuplicateReviewModalProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isDeleting, setIsDeleting] = useState(false)

  const totalDuplicates = useMemo(
    () => groups.reduce((acc, group) => acc + group.presets.length, 0),
    [groups],
  )

  const togglePreset = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((selectedId) => selectedId !== id))
      return
    }

    setSelectedIds([...selectedIds, id])
  }

  const handleSelectAllExceptFirst = () => {
    const nextIds = groups.flatMap((group) => {
      const keepIndex = getSuggestedKeepIndex(group.presets)
      return group.presets
        .filter((_, index) => index !== keepIndex)
        .map((preset) => preset.id)
    })
    setSelectedIds(nextIds)
  }

  const handleClear = () => {
    setSelectedIds([])
  }

  if (!isOpen) {
    return null
  }

  return (
    <ModalShell panelClassName="w-full max-w-4xl" onClose={onClose}>
      <h2 className="mb-1 text-xl font-bold">Duplicate Preset Review</h2>
      <p className="mb-4 text-sm opacity-70">
        {groups.length} duplicate groups, {totalDuplicates} total duplicate presets.
      </p>

      {groups.length === 0 ? (
        <div className="p-4 rounded-md bg-base-200">No duplicates found.</div>
      ) : (
        <div className="max-h-[55vh] overflow-auto space-y-3 pr-1">
          {groups.map((group, groupIndex) => (
            <div key={group.fingerprint} className="p-3 border rounded-lg border-base-content/15">
              <div className="mb-2 text-sm font-semibold">
                Group {groupIndex + 1} ({group.presets.length} presets)
              </div>
              <div className="space-y-2">
                {(() => {
                  const keepIndex = getSuggestedKeepIndex(group.presets)
                  return group.presets.map((preset, presetIndex) => {
                    const checked = selectedIds.includes(preset.id)
                    return (
                      <label
                        key={preset.id}
                        className="flex items-center justify-between gap-3 p-2 rounded-md cursor-pointer bg-base-200/60"
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            className="checkbox checkbox-sm"
                            checked={checked}
                            onChange={() => togglePreset(preset.id)}
                          />
                          <span className="font-medium">{preset.name}</span>
                          {preset.favorite && (
                            <span className="badge badge-warning badge-sm">Favorite</span>
                          )}
                          <span className="text-xs opacity-70">by {preset.author || 'Unknown'}</span>
                        </div>
                        {presetIndex === keepIndex && (
                          <span className="badge badge-success badge-sm">Suggested keep</span>
                        )}
                      </label>
                    )
                  })
                })()}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap justify-end gap-2 mt-4">
        <Button variant="secondary" onClick={onClose} disabled={isDeleting}>
          Close
        </Button>
        <Button variant="neutral" onClick={handleClear} disabled={isDeleting || selectedIds.length === 0}>
          Clear Selection
        </Button>
        <Button
          variant="accent"
          onClick={handleSelectAllExceptFirst}
          disabled={isDeleting || groups.length === 0}
        >
          Select All Except Suggested Keep
        </Button>
        <Button
          variant="error"
          disabled={isDeleting || selectedIds.length === 0}
          onClick={async () => {
            setIsDeleting(true)
            try {
              await onDeletePresets(selectedIds)
              setSelectedIds([])
            } finally {
              setIsDeleting(false)
            }
          }}
        >
          Delete Selected ({selectedIds.length})
        </Button>
      </div>
    </ModalShell>
  )
}
