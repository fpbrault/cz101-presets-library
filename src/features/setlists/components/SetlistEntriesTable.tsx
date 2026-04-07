import { useRef, useState } from 'react'
import Button from '@/components/ui/Button'
import { Playlist, PlaylistEntry } from '@/lib/collections/playlistManager'
import { Preset } from '@/lib/presets/presetManager'

interface SetlistEntriesTableProps {
  playlist: Playlist
  presets: Preset[]
  quickSendIndex: number | null
  onRemoveEntry: (playlistId: string, entryId: string) => void
  onReorderEntries: (playlistId: string, fromIndex: number, toIndex: number) => void
}

export default function SetlistEntriesTable({
  playlist,
  presets,
  quickSendIndex,
  onRemoveEntry,
  onReorderEntries,
}: SetlistEntriesTableProps) {
  const dragIndex = useRef<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  const getPreset = (presetId: string): Preset | undefined =>
    presets.find((p) => p.id === presetId)

  const handleDragStart = (index: number) => {
    dragIndex.current = index
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    setDragOverIndex(index)
  }

  const handleDrop = (toIndex: number) => {
    const fromIndex = dragIndex.current
    if (fromIndex !== null && fromIndex !== toIndex) {
      onReorderEntries(playlist.id, fromIndex, toIndex)
    }
    dragIndex.current = null
    setDragOverIndex(null)
  }

  const handleDragEnd = () => {
    dragIndex.current = null
    setDragOverIndex(null)
  }

  if (playlist.entries.length === 0) {
    return (
      <div className="flex items-center justify-center flex-grow p-8 text-sm opacity-60">
        No presets in this setlist. Add presets using the button above.
      </div>
    )
  }

  return (
    <div className="flex-grow overflow-auto">
      <table className="table table-sm table-zebra">
        <thead>
          <tr>
            <th className="w-8">#</th>
            <th className="w-6"></th>
            <th>Preset</th>
            <th>Author</th>
            <th>Tags</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {playlist.entries.map((entry: PlaylistEntry, index: number) => {
            const preset = getPreset(entry.presetId)
            const isCurrentStep = quickSendIndex === index
            return (
              <tr
                key={entry.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={() => handleDrop(index)}
                onDragEnd={handleDragEnd}
                className={
                  (isCurrentStep ? 'bg-accent/20 font-bold ' : '') +
                  (dragOverIndex === index ? 'opacity-50 ' : '')
                }
              >
                <td className="text-xs opacity-60">{index + 1}</td>
                <td>
                  <span
                    className="cursor-grab text-base-content/40 select-none"
                    title="Drag to reorder"
                  >
                    ⠿
                  </span>
                </td>
                <td>
                  {preset ? (
                    <span className={isCurrentStep ? 'text-accent' : ''}>
                      {preset.name}
                    </span>
                  ) : (
                    <span className="opacity-40 italic">Preset not found</span>
                  )}
                </td>
                <td className="text-xs">{preset?.author || '-'}</td>
                <td>
                  <div className="flex flex-wrap gap-1">
                    {preset?.tags?.map((tag) => (
                      <span key={tag} className="badge badge-ghost badge-xs">
                        {tag}
                      </span>
                    ))}
                  </div>
                </td>
                <td>
                  <Button
                    variant="error"
                    size="sm"
                    onClick={() => onRemoveEntry(playlist.id, entry.id)}
                  >
                    Remove
                  </Button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
