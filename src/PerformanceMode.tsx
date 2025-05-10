import React, { useState, useEffect } from 'react'
import { fetchPresetData, Preset } from './lib/presetManager'
import { FaMagnifyingGlass, FaX } from 'react-icons/fa6'
import { useSearchFilter } from './SearchFilterContext'

type PerformanceModeProps = {
  currentPreset: Preset | null
  handleSelectPreset: (preset: Preset) => void
}

const PerformanceMode: React.FC<PerformanceModeProps> = ({
  currentPreset,
  handleSelectPreset,
}) => {
  const [currentBank, setCurrentBank] = useState(0)
  const [presets, setPresets] = useState<Preset[]>([])
  const [isNumPadOpen, setIsNumPadOpen] = useState(false)
  const [bankInput, setBankInput] = useState('')

  const {
    searchTerm,
    selectedTags,
    filterMode,
    sorting,
    setSelectedTags,
    favoritesOnly,
    setFavoritesOnly,
  } = useSearchFilter()

  const handleTagClick = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag))
    } else {
      setSelectedTags([...selectedTags, tag])
    }
  }

  useEffect(() => {
    const fetchPresets = async () => {
      const data = await fetchPresetData(
        0,
        -1,
        sorting,
        searchTerm,
        selectedTags,
        filterMode,
        favoritesOnly,
      )

      setPresets(data.presets)
    }

    fetchPresets()
  }, [searchTerm, selectedTags, filterMode, sorting, favoritesOnly])

  const handleOpenNumPad = () => {
    setBankInput('')
    setIsNumPadOpen(true)
  }
  const handleCloseNumPad = () => setIsNumPadOpen(false)
  const handleNumPadClick = (num: string) => setBankInput(bankInput + num)
  const handleClearNumPad = () => setBankInput('')
  const handleSelectBank = () => {
    const bankNumber = parseInt(bankInput, 10) - 1
    if (bankNumber >= 0 && bankNumber < Math.ceil(presets?.length / 8)) {
      setCurrentBank(bankNumber)
      handleCloseNumPad()
    }
  }

  const handleNextBank = () => {
    if ((currentBank + 1) * 8 < presets.length) {
      setCurrentBank(currentBank + 1)
    }
  }

  const handlePreviousBank = () => {
    if (currentBank > 0) {
      setCurrentBank(currentBank - 1)
    }
  }

  const currentPresets = presets

    .slice(currentBank * 8, (currentBank + 1) * 8)
    .map((preset, index) => ({
      ...preset,
      number: currentBank * 8 + index + 1,
    }))

  const totalBanks = Math.ceil(presets.length / 8)

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
              onPointerUp={() => handleTagClick(tag)}
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
          onPointerUp={() => setFavoritesOnly(!favoritesOnly)}
          className={`btn btn-lg btn-accent`}
        >
          {favoritesOnly ? 'Show All' : 'Show Favorites'}
        </button>
      </div>
      <div className="flex h-full gap-4 pb-16">
        <div className="grid flex-grow grid-cols-2 grid-rows-4 gap-4 w-ful lg:grid-cols-4 lg:grid-rows-2 font-performanceMode">
          {currentPresets.map((preset) => (
            <button
              key={preset.id}
              onPointerUp={() => handleSelectPreset(preset)}
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
            onPointerUp={handlePreviousBank}
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
                Presets: {currentBank * 8 + 1}/{presets.length}{' '}
              </span>
            </div>
            <button
              onPointerUp={handleOpenNumPad}
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
            onPointerUp={handleNextBank}
            onTouchEnd={(event) => {
              event.stopPropagation()
              handleNextBank()
            }}
            disabled={(currentBank + 1) * 8 >= presets.length}
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
                  onPointerUp={() => handleNumPadClick((num + 1).toString())}
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
                onPointerUp={handleClearNumPad}
                onTouchEnd={(event) => {
                  event.stopPropagation()
                  handleClearNumPad()
                }}
                className="btn btn-secondary"
              >
                <FaX size={24} />
              </button>
              <button
                disabled={parseInt(bankInput + '0', 10) > totalBanks}
                onPointerUp={() => handleNumPadClick('0')}
                onTouchEnd={(event) => {
                  event.stopPropagation()
                  handleNumPadClick('0')
                }}
                className="text-3xl btn btn-primary"
              >
                0
              </button>
              <button
                onPointerUp={handleSelectBank}
                onTouchEnd={(event) => {
                  event.stopPropagation()
                  handleSelectBank()
                }}
                className="col-span-1 text-xl btn btn-primary"
              >
                Select
              </button>
            </div>
            <button
              onPointerUp={handleCloseNumPad}
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
