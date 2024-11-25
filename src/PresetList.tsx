import React, { useState, useEffect } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { Preset } from './lib/presetManager'
import {
  FaPlusSquare,
  FaSort,
  FaSortUp,
  FaSortDown,
  FaHeart,
  FaRegHeart,
  FaTimes,
  FaStar,
  FaRegStar,
} from 'react-icons/fa'

interface PresetListProps {
  currentPreset: Preset | null
  filteredPresets: Preset[]
  handleRowClick: (e: React.MouseEvent<HTMLTableRowElement>) => void
  handleSelectPreset: (preset: Preset) => void
  handleSetFavorite: (reset: Preset) => void
  handleSetRating: (reset: Preset, rating: 1 | 2 | 3 | 4 | 5) => void
}

const PresetList: React.FC<PresetListProps> = ({
  currentPreset,
  filteredPresets,
  handleRowClick,
  handleSelectPreset,
  handleSetFavorite,
  handleSetRating,
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
        if (sortConfig.key === 'favorite') {
          // Handle boolean favorite values
          if (a.favorite === b.favorite) return 0
          return sortConfig.direction === 'ascending'
            ? a.favorite
              ? -1
              : 1
            : a.favorite
              ? 1
              : -1
        }
        if (sortConfig.key === 'rating') {
          const aRating = a.rating || 0
          const bRating = b.rating || 0
          return sortConfig.direction === 'ascending'
            ? aRating - bRating
            : bRating - aRating
        }
        // Existing string comparison logic
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
  const isColumnSorted = (key: string) => {
    return sortConfig?.key === key
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
    <div className="flex flex-col flex-grow select-none bg-base-300">
      <div className="flex items-center justify-between bg-base-200">
        <div>
          <div className="relative inline-block">
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-8 mx-4 my-2 input input-secondary input-md"
            />
            {searchTerm && (
              <button
                className="absolute text-gray-500 -translate-y-1/2 right-6 top-1/2 hover:text-gray-700"
                onClick={() => setSearchTerm('')}
              >
                <FaTimes size={20} />
              </button>
            )}
          </div>

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
            <tr className="text-xl">
              <th className="hidden"></th>
              <th
                onClick={() => requestSort('favorite')}
                className={`w-2 ${isColumnSorted('favorite') ? 'font-bold text-primary' : 'font-normal'}`}
              >
                <FaHeart size={20} className="inline" />
                {getSortIcon('favorite')}
              </th>
              <th
                onClick={() => requestSort('name')}
                className={
                  isColumnSorted('name')
                    ? 'font-bold text-primary'
                    : 'font-normal'
                }
              >
                Name {getSortIcon('name')}
              </th>

              <th
                onClick={() => requestSort('author')}
                className={
                  isColumnSorted('author')
                    ? 'font-bold text-primary'
                    : 'font-normal'
                }
              >
                Author {getSortIcon('author')}
              </th>
              <th className="font-normal">Tags</th>
              <th
                onClick={() => requestSort('rating')}
                className={`w-32 ${isColumnSorted('rating') ? 'font-bold text-primary' : 'font-normal'}`}
              >
                Rating {getSortIcon('rating')}
              </th>
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
                <td>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleSetFavorite(preset)
                    }}
                  >
                    {preset.favorite ? (
                      <FaHeart
                        size={20}
                        className="hover:text-base-content text-primary"
                      />
                    ) : (
                      <FaRegHeart size={20} className="hover:text-primary" />
                    )}
                  </button>
                </td>
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
                <td>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onMouseEnter={(e) => {
                        const parent = e.currentTarget.parentElement
                        if (parent) {
                          const stars = parent.querySelectorAll('button')
                          stars.forEach((s, i) => {
                            if (i < star) s.classList.add('text-primary')
                            else s.classList.remove('text-primary')
                          })
                        }
                      }}
                      onMouseLeave={(e) => {
                        const parent = e.currentTarget.parentElement
                        if (parent) {
                          const stars = parent.querySelectorAll('button')
                          stars.forEach((s, i) => {
                            if (i < (preset.rating || 0))
                              s.classList.add('text-primary')
                            else s.classList.remove('text-primary')
                          })
                        }
                      }}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleSetRating(preset, star as 1 | 2 | 3 | 4 | 5)
                      }}
                      className={`hover:text-primary transition-colors ${
                        star <= (preset.rating || 0) ? 'text-primary' : ''
                      }`}
                    >
                      {star <= (preset.rating || 0) ? (
                        <FaStar size={16} />
                      ) : (
                        <FaRegStar size={16} />
                      )}
                    </button>
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
