import React, { useState, useEffect } from 'react'
import { Preset } from './lib/presetManager'

type PerformanceModeProps = {
  presets: Preset[]
  currentPreset: Preset | null
  selectedTags: string[]
  handleSelectPreset: (preset: Preset) => void
  handleTagClick: (tag: string) => void
}

const PerformanceMode: React.FC<PerformanceModeProps> = ({
  presets,
  currentPreset,
  selectedTags,
  handleSelectPreset,
  handleTagClick,
}) => {
  const [currentBank, setCurrentBank] = useState(0)
  const [filteredPresets, setFilteredPresets] = useState<Preset[]>(presets)
  const [showFavorites, setShowFavorites] = useState(false)

  useEffect(() => {
    let updatedPresets = presets

    if (selectedTags.length > 0) {
      updatedPresets = updatedPresets.filter((preset) =>
        selectedTags.every((tag) => preset.tags.includes(tag)),
      )
    }

    if (showFavorites) {
      updatedPresets = updatedPresets.filter((preset) => preset.favorite)
    }

    setFilteredPresets(updatedPresets)
    setCurrentBank(0) // Reset to the first bank when filters change
  }, [selectedTags, showFavorites, presets])

  const handleNextBank = () => {
    if ((currentBank + 1) * 8 < filteredPresets.length) {
      setCurrentBank(currentBank + 1)
    }
  }

  const handlePreviousBank = () => {
    if (currentBank > 0) {
      setCurrentBank(currentBank - 1)
    }
  }

  const currentPresets = filteredPresets
    .slice(currentBank * 8, (currentBank + 1) * 8)
    .map((preset, index) => ({
      ...preset,
      number: currentBank * 8 + index + 1,
    }))

  return (
    <div className="flex flex-col w-full h-full gap-4 p-2">
      <div className="flex justify-between gap-4">
        <div className="flex flex-wrap w-1/2 gap-2">
          Filters:
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
              className={`badge badge-lg font-bold capitalize badge-neutral ${
                selectedTags.includes(tag) ? 'badge-primary' : ''
              }`}
              onClick={() => handleTagClick(tag)}
            >
              {tag} ({count})
            </div>
          ))}
        </div>
        <button
          onClick={() => setShowFavorites(!showFavorites)}
          className={`btn btn-lg btn-accent`}
        >
          {showFavorites ? 'Show All' : 'Show Favorites'}
        </button>
      </div>
      <div className="flex h-full gap-4 pb-16">
        <div className="grid flex-grow grid-cols-2 grid-rows-4 gap-4 lg:grid-cols-4 lg:grid-rows-2 w-7/8 font-performanceMode">
          {currentPresets.map((preset) => (
            <button
              key={preset.id}
              onClick={() => handleSelectPreset(preset)}
              className={
                'h-full btn btn-lg text-xl md:text-2xl xl:text-4xl flex flex-col justify-between items-center uppercase break-all sm:break-normal' +
                (currentPreset?.id === preset.id
                  ? ' btn-primary'
                  : ' btn-secondary')
              }
            >
              <span className="flex items-center flex-grow font-bold">
                {preset.name}
              </span>

              <span className="text-4xl">{preset.number}</span>
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-4 w-1/8">
          <button
            onClick={handlePreviousBank}
            className="flex-grow btn btn-lg btn-secondary"
          >
            Previous Bank
          </button>
          <div className="flex flex-col items-center">
            <span>
              Bank: {currentBank + 1}/{Math.ceil(filteredPresets.length / 8)}
            </span>
            <span>
              Presets: {currentBank * 8 + 1}/{filteredPresets.length}{' '}
            </span>
          </div>
          <button
            onClick={handleNextBank}
            className="flex-grow btn btn-lg btn-secondary"
          >
            Next Bank
          </button>
        </div>
      </div>
    </div>
  )
}

export default PerformanceMode
