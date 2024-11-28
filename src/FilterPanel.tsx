// src/FilterPanel.tsx
import React from 'react'
import { FaCheckCircle, FaRegDotCircle, FaTrash } from 'react-icons/fa'
import { Preset } from './lib/presetManager'
import { useSearchFilter } from './SearchFilterContext'

interface FilterPanelProps {
  presets: Preset[]
}

const FilterPanel: React.FC<FilterPanelProps> = ({ presets }) => {
  const { selectedTags, filterMode, setFilterMode, setSelectedTags } =
    useSearchFilter()

  const handleToggleFilterMode = () => {
    if (filterMode === 'inclusive') {
      setFilterMode('exclusive')
    } else {
      setFilterMode('inclusive')
    }
  }

  const handleTagClick = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag))
    } else {
      setSelectedTags([...selectedTags, tag])
    }
  }

  const handleClearFilters = () => {
    selectedTags.forEach((tag) => handleTagClick(tag))
  }

  return (
    <>
      <div className="flex flex-col h-full gap-2 overflow-auto">
        <h3>Filters</h3>
        <button
          onClick={handleClearFilters}
          className="mt-2 btn btn-lg btn-error"
        >
          Clear Filters <FaTrash size={12} />
        </button>
        <button
          onClick={handleToggleFilterMode}
          className="mt-2 btn btn-lg btn-info"
        >
          {filterMode === 'exclusive' ? (
            <>
              Match Any
              <FaRegDotCircle size={16} />
            </>
          ) : (
            <>
              Match All
              <FaCheckCircle size={16} />
            </>
          )}
        </button>
        <div className="flex flex-wrap content-start flex-grow gap-1 overflow-scroll ">
          {Object.entries(
            presets
              .map((preset) => preset.tags.map((tag) => tag.toLowerCase()))
              .flat()
              .reduce(
                (acc, tag) => {
                  if (acc[tag]) {
                    acc[tag]++
                  } else {
                    acc[tag] = 1
                  }
                  return acc
                },
                {} as Record<string, number>,
              ),
          ).map(([tag, count]) => (
            <div
              key={tag}
              className={`badge badge-lg text-lg p-3 font-bold capitalize badge-neutral ${
                selectedTags.includes(tag) ? 'badge-primary' : ''
              }`}
              onClick={() => handleTagClick(tag)}
            >
              {tag} ({count})
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

export default FilterPanel
