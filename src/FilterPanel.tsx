// src/FilterPanel.tsx
import React from 'react'
import { FaCheckCircle, FaRegDotCircle, FaTrash } from 'react-icons/fa'
import { Preset } from './lib/presetManager'

interface FilterPanelProps {
  selectedTags: string[]
  filterMode: 'inclusive' | 'exclusive'
  presets: Preset[]
  handleClearFilters: () => void
  handleToggleFilterMode: () => void
  handleTagClick: (tag: string) => void
}

const FilterPanel: React.FC<FilterPanelProps> = ({
  selectedTags,
  filterMode,
  presets,
  handleClearFilters,
  handleToggleFilterMode,
  handleTagClick,
}) => {
  return (
    <>
      <div className="flex flex-col gap-2 ">
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
            className={`badge badge-lg p-4 text-2xl font-bold capitalize badge-neutral ${
              selectedTags.includes(tag) ? 'badge-primary' : ''
            }`}
            onClick={() => handleTagClick(tag)}
          >
            {tag} ({count})
          </div>
        ))}
      </div>
    </>
  )
}

export default FilterPanel
