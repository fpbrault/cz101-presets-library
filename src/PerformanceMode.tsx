import React, { useState, useEffect } from 'react'
import { Preset } from './lib/presetManager'
import { FaCog, FaCross } from 'react-icons/fa'
import { FaMagnifyingGlass, FaX } from 'react-icons/fa6'

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
  const [isNumPadOpen, setIsNumPadOpen] = useState(false)
  const [bankInput, setBankInput] = useState('')

  const handleOpenNumPad = () => {
    setBankInput('')
    setIsNumPadOpen(true)
  }
  const handleCloseNumPad = () => setIsNumPadOpen(false)
  const handleNumPadClick = (num: string) => setBankInput(bankInput + num)
  const handleClearNumPad = () => setBankInput('')
  const handleSelectBank = () => {
    const bankNumber = parseInt(bankInput, 10) - 1
    if (bankNumber >= 0 && bankNumber < Math.ceil(filteredPresets.length / 8)) {
      setCurrentBank(bankNumber)
      handleCloseNumPad()
    }
  }

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

  const totalBanks = Math.ceil(filteredPresets.length / 8)

  return (
    <div className="flex flex-col w-full h-full gap-4 p-2">
      <div className="flex items-center justify-between h-24 gap-4 ">
        <div className="flex flex-wrap content-start w-1/2 h-24 gap-2 overflow-auto">
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
              onTouchEnd={(event) => {
                event.stopPropagation()
                handleTagClick(tag)
              }}
            >
              {tag} ({count})
            </div>
          ))}
        </div>
        <div className="flex items-center justify-center w-full h-full p-4 rounded-md shadow-md bg-base-300 max-w-96">
          <span className="ml-2 text-2xl font-bold font-performanceMode">
            {currentPreset?.number} | {currentPreset?.name || 'None'}
          </span>
        </div>
        <button
          onClick={() => setShowFavorites(!showFavorites)}
          onTouchEnd={(event) => {
            event.stopPropagation()
            setShowFavorites(!showFavorites)
          }}
          className={`btn btn-lg btn-accent`}
        >
          {showFavorites ? 'Show All' : 'Show Favorites'}
        </button>
      </div>
      <div className="flex h-full gap-4 pb-16">
        <div className="grid flex-grow grid-cols-2 grid-rows-4 gap-4 w-ful lg:grid-cols-4 lg:grid-rows-2 font-performanceMode">
          {currentPresets.map((preset) => (
            <button
              key={preset.id}
              onClick={() => handleSelectPreset(preset)}
              onTouchEnd={(event) => {
                event.stopPropagation()
                handleSelectPreset(preset)
              }}
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
        <div className="flex flex-col w-full gap-4 max-w-48">
          <button
            onClick={handlePreviousBank}
            onTouchEnd={(event) => {
              event.stopPropagation()
              handlePreviousBank()
            }}
            disabled={currentBank === 0}
            className="flex-grow w-full text-2xl btn btn-lg btn-secondary"
          >
            Previous Bank
          </button>
          <div className="flex justify-evenly">
            <div className="flex flex-col items-center gap-2">
              <span>
                Bank: {currentBank + 1}/{totalBanks}
              </span>
              <span>
                Presets: {currentBank * 8 + 1}/{filteredPresets.length}{' '}
              </span>
            </div>
            <button
              onClick={handleOpenNumPad}
              onTouchEnd={(event) => {
                event.stopPropagation()
                handleOpenNumPad()
              }}
              className="btn btn-square btn-xl btn-primary"
            >
              <FaMagnifyingGlass size={32} />
            </button>
          </div>
          <button
            onClick={handleNextBank}
            onTouchEnd={(event) => {
              event.stopPropagation()
              handleNextBank()
            }}
            disabled={(currentBank + 1) * 8 >= filteredPresets.length}
            className="flex-grow text-2xl btn btn-lg btn-secondary"
          >
            Next Bank
          </button>
        </div>
      </div>
      {isNumPadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 font-performanceMode">
          <div className="p-4 shadow-lg bg-base-100 rounded-xl">
            <h2 className="mb-4 text-xl">Select Bank</h2>
            <input
              type="text"
              value={bankInput}
              className="mb-2 text-xl form-input input input-primary w-fit"
              readOnly
            />
            <div className="grid grid-cols-3 gap-2">
              {[...Array(9).keys()].map((num) => (
                <button
                  key={num + 1}
                  onClick={() => handleNumPadClick((num + 1).toString())}
                  onTouchEnd={(event) => {
                    event.stopPropagation()
                    handleNumPadClick((num + 1).toString())
                  }}
                  className="text-3xl btn btn-primary"
                  disabled={parseInt(bankInput + (num + 1), 10) > totalBanks}
                >
                  {num + 1}
                </button>
              ))}
              <button
                onClick={handleClearNumPad}
                onTouchEnd={(event) => {
                  event.stopPropagation()
                  handleClearNumPad()
                }}
                className="btn btn-secondary"
              >
                <FaX size={24} />
              </button>
              <button
                onClick={handleSelectBank}
                onTouchEnd={(event) => {
                  event.stopPropagation()
                  handleSelectBank()
                }}
                className="col-span-2 text-xl btn btn-primary"
              >
                Select
              </button>
            </div>
            <button
              onClick={handleCloseNumPad}
              onTouchEnd={(event) => {
                event.stopPropagation()
                handleCloseNumPad()
              }}
              className="mt-4 btn"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default PerformanceMode
