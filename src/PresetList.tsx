import React, { useState, useEffect } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { Preset } from './lib/presetManager'
import { FaPlusSquare, FaSort, FaSortUp, FaSortDown } from 'react-icons/fa'

interface PresetListProps {
  currentPreset: Preset | null
  filteredPresets: Preset[]
  handleRowClick: (e: React.MouseEvent<HTMLTableRowElement>) => void
  handleSelectPreset: (preset: Preset) => void
}

const PresetList: React.FC<PresetListProps> = ({
  currentPreset,
  filteredPresets,
  handleRowClick,
  handleSelectPreset,
}) => {
  const [sortConfig, setSortConfig] = useState<{
    key: string
    direction: string
  } | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  const sortedPresets = React.useMemo(() => {
    let sortablePresets = [...filteredPresets]
    if (sortConfig !== null) {
      sortablePresets.sort((a, b) => {
        const aValue = a[sortConfig.key].toString().toLowerCase()
        const bValue = b[sortConfig.key].toString().toLowerCase()
        if (aValue < bValue) {
          return sortConfig.direction === 'ascending' ? -1 : 1
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'ascending' ? 1 : -1
        }
        return 0
      })
    }
    return sortablePresets
  }, [filteredPresets, sortConfig])

  const filteredAndSortedPresets = sortedPresets.filter(
    (preset) =>
      preset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      preset.author?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      preset.tags.some((tag) =>
        tag.toLowerCase().includes(searchTerm.toLowerCase()),
      ),
  )

  const requestSort = (key: string) => {
    if (!sortConfig || sortConfig.key !== key) {
      setSortConfig({ key, direction: 'ascending' })
    } else if (sortConfig.direction === 'ascending') {
      setSortConfig({ key, direction: 'descending' })
    } else {
      setSortConfig(null)
    }
  }
  const getSortIcon = (key: string) => {
    if (!sortConfig || sortConfig.key !== key) {
      return <FaSort className="inline" />
    }
    if (sortConfig.direction === 'ascending') {
      return <FaSortUp className="inline" />
    }
    return <FaSortDown className="inline" />
  }
  // Add this helper function before the useEffect
  const isElementInViewport = (element: HTMLElement) => {
    const container = element.closest('.overflow-auto')
    if (!container) return true

    const containerRect = container.getBoundingClientRect()
    const elementRect = element.getBoundingClientRect()

    return (
      elementRect.top >= containerRect.top &&
      elementRect.bottom <= containerRect.bottom
    )
  }

  // Modify the useEffect keyboard handler section:
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (currentPreset) {
        const currentIndex = filteredAndSortedPresets.findIndex(
          (preset) => preset.id === currentPreset.id,
        )
        let newIndex = currentIndex
        if (e.key === 'ArrowUp' && currentIndex > 0) {
          e.preventDefault()
          newIndex = currentIndex - 1
        } else if (
          e.key === 'ArrowDown' &&
          currentIndex < filteredAndSortedPresets.length - 1
        ) {
          e.preventDefault()
          newIndex = currentIndex + 1
        }

        if (newIndex !== currentIndex) {
          const newPreset = filteredAndSortedPresets[newIndex]
          handleSelectPreset(newPreset)

          // Only scroll if the new selected preset is not visible
          const row = document.getElementById('preset-' + newPreset.id)
          if (row && !isElementInViewport(row)) {
            row.scrollIntoView({ block: 'center', behavior: 'instant' })
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [currentPreset, filteredAndSortedPresets, handleSelectPreset])
  return (
    <div className="flex flex-col flex-grow bg-base-300">
      <div className="flex items-center justify-between bg-base-200">
        <div>
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="mx-4 my-2 input input-secondary input-md"
          />

          <span>{filteredAndSortedPresets.length} Presets Found</span>
        </div>
        <div
          id="drop-area"
          className="p-2 mx-4 my-2 border-2 border-gray-400 border-dashed hover:bg-base-300 bg-base-100"
        >
          <FaPlusSquare size={20} className="inline mr-2"></FaPlusSquare>Drag
          and drop a .syx file or click here to add a new preset
        </div>
      </div>
      <div className="max-h-full overflow-auto ">
        <table className="relative table table-lg ">
          <thead className="sticky top-0 bg-base-300">
            <tr>
              <th className="hidden"></th>
              <th onClick={() => requestSort('name')}>
                Name {getSortIcon('name')}
              </th>
              <th onClick={() => requestSort('author')}>
                Author {getSortIcon('author')}
              </th>
              <th>Tags</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedPresets.map((preset) => (
              <tr
                id={'preset-' + preset.id}
                key={preset.id}
                className={
                  currentPreset?.id === preset.id
                    ? 'bg-neutral text-neutral-content'
                    : ''
                }
                onClick={handleRowClick}
              >
                <td className="hidden">{preset.id}</td>
                <td className="text-xl font-bold">{preset.name}</td>
                <td>{preset.author}</td>
                <td className="flex gap-2">
                  {preset.tags.map((tag: string) => (
                    <span
                      key={uuidv4()}
                      className="capitalize badge badge-primary"
                    >
                      {tag.toLowerCase()}
                    </span>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default PresetList
