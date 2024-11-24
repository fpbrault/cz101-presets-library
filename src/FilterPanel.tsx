// src/FilterPanel.tsx
import React from 'react'
import { FaCheckCircle, FaRegDotCircle, FaTrash } from 'react-icons/fa'
import { Preset } from './lib/presetManager'
import { saveToLocalStorage } from './utils'

interface FilterPanelProps {
  autoSend: boolean
  midiPorts: string[]
  selectedMidiPort: string
  selectedTags: string[]
  filterMode: 'inclusive' | 'exclusive'
  presets: Preset[]
  handleToggleAutoSend: () => void
  handleClearFilters: () => void
  handleToggleFilterMode: () => void
  handleTagClick: (tag: string) => void
  setSelectedMidiPort: (port: string) => void
}

const FilterPanel: React.FC<FilterPanelProps> = ({
  autoSend,
  midiPorts,
  selectedMidiPort,
  selectedTags,
  filterMode,
  presets,
  handleToggleAutoSend,
  handleClearFilters,
  handleToggleFilterMode,
  handleTagClick,
  setSelectedMidiPort,
}) => {
  return (
    <div className="w-64 flex flex-col p-4 bg-base-200 h-full overflow-auto gap-2">
      <div className="flex flex-col gap-2">
        <button className="btn btn-lg btn-primary">Send Preset</button>
        <button
          className={`btn btn-lg ${autoSend ? 'btn-success' : 'btn-neutral'}`}
          onClick={handleToggleAutoSend}
        >
          Auto Send{' '}
        </button>
        <select
          className="select select-bordered"
          value={selectedMidiPort}
          onChange={(e) => {
            setSelectedMidiPort(e.target.value)
            saveToLocalStorage('selectedMidiPort', e.target.value)
          }}
        >
          {midiPorts.map((port) => (
            <option key={port} value={port}>
              {port}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-2 ">
        <h3>Filters</h3>
        <button
          onClick={handleClearFilters}
          className="btn btn-lg btn-error mt-2"
        >
          Clear Filters <FaTrash size={12} />
        </button>
        <button
          onClick={handleToggleFilterMode}
          className="btn btn-lg btn-info mt-2"
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
            .map((preset) => preset.tags)
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
            className={`badge badge-lg badge-neutral ${
              selectedTags.includes(tag) ? 'badge-primary' : ''
            }`}
            onClick={() => handleTagClick(tag)}
          >
            {tag} ({count})
          </div>
        ))}
      </div>
    </div>
  )
}

export default FilterPanel
