import React, { useState, useEffect, useRef, useMemo } from 'react'
import { fetchPresetData, Preset } from '@/lib/presets/presetManager'
import { getPlaylistById } from '@/lib/collections/playlistManager'
import { useQuery } from '@tanstack/react-query'
import { FaMagnifyingGlass, FaX } from 'react-icons/fa6'
import { WebMidi } from 'webmidi'
import { useMidiChannel } from '@/MidiChannelContext'
import { useMidiPort } from '@/MidiPortContext'
import { useSearchFilter } from '@/SearchFilterContext'
import Button from '@/components/Button'
import { getPresetQueryKey } from '@/lib/presets/presetQueryKey'

type PerformanceModeProps = {
  currentPreset: Preset | null
  handleSelectPreset: (preset: Preset) => void
}

const PerformanceMode: React.FC<PerformanceModeProps> = ({
  currentPreset,
  handleSelectPreset,
}) => {
  const { selectedMidiChannel } = useMidiChannel()
  const { selectedMidiPort } = useMidiPort()
  const [currentBank, setCurrentBank] = useState(0)
  const [isNumPadOpen, setIsNumPadOpen] = useState(false)
  const [bankInput, setBankInput] = useState('')
  const [vibratoEnabled, setVibratoEnabled] = useState(false)
  const [portamentoEnabled, setPortamentoEnabled] = useState(false)
  const [portamentoTime, setPortamentoTime] = useState(0)
  const [controlMessage, setControlMessage] = useState('')

  const containerRef = useRef<HTMLDivElement>(null)

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }

  const {
    searchTerm,
    selectedTags,
    filterMode,
    sorting,
    setSelectedTags,
    favoritesOnly,
    setFavoritesOnly,
    duplicatesOnly,
    activePlaylistId,
    setActivePlaylistId,
  } = useSearchFilter()

  const playlistPresetIds = useMemo<string[] | null>(() => {
    if (!activePlaylistId) return null
    const playlist = getPlaylistById(activePlaylistId)
    return playlist ? playlist.entries.map((e) => e.presetId) : null
  }, [activePlaylistId])

  const activePlaylist = activePlaylistId ? getPlaylistById(activePlaylistId) : null

  const handleTagClick = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag))
    } else {
      setSelectedTags([...selectedTags, tag])
    }
  }

  const presetQueryKey = getPresetQueryKey({
    sorting,
    searchTerm,
    selectedTags,
    filterMode,
    favoritesOnly,
    duplicatesOnly,
    randomOrder: false,
    activePlaylistId,
  })

  const { data } = useQuery({
    queryKey: [...presetQueryKey, 'performance-mode'],
    queryFn: async () => {
      const result = await fetchPresetData(
        0,
        -1,
        sorting,
        searchTerm,
        selectedTags,
        filterMode,
        favoritesOnly,
        false,
        0,
        duplicatesOnly,
        false,
        playlistPresetIds,
      )
      return result.presets
    },
    refetchOnWindowFocus: false,
  })

  const presets = data ?? []

  useEffect(() => {
    setCurrentBank(0)
  }, [searchTerm, selectedTags, filterMode, sorting, favoritesOnly, duplicatesOnly, activePlaylistId])

  useEffect(() => {
    const totalBanks = Math.max(1, Math.ceil(presets.length / 8))
    if (currentBank >= totalBanks) {
      setCurrentBank(totalBanks - 1)
    }
  }, [currentBank, presets.length])

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

  const sendControlChange = async (controller: number, value: number) => {
    if (!selectedMidiPort) {
      setControlMessage('Select a MIDI port before sending performance controls.')
      return
    }

    if (!WebMidi.enabled) {
      await WebMidi.enable({ sysex: true })
    }

    const output = WebMidi.getOutputByName(selectedMidiPort)
    if (!output) {
      setControlMessage('Selected MIDI output is not available.')
      return
    }

    output.sendControlChange(controller, value, { channels: selectedMidiChannel })
  }

  const handleToggleVibrato = async () => {
    const next = !vibratoEnabled
    await sendControlChange(1, next ? 127 : 0)
    setVibratoEnabled(next)
    setControlMessage(`Vibrato ${next ? 'enabled' : 'disabled'}.`)
  }

  const handleTogglePortamento = async () => {
    const next = !portamentoEnabled
    await sendControlChange(41, next ? 127 : 0)
    setPortamentoEnabled(next)
    setControlMessage(`Portamento ${next ? 'enabled' : 'disabled'}.`)
  }

  const handlePortamentoTimeChange = async (value: number) => {
    setPortamentoTime(value)
    await sendControlChange(5, value)
    setControlMessage(`Portamento time set to ${value}.`)
  }

  return (
    <div
      ref={containerRef}
      data-theme="cyberpunk"
      className="flex flex-col w-full h-full gap-4 p-2"
    >
      <div className="flex flex-wrap items-start gap-3">
        <button onClick={toggleFullscreen} className="btn btn-primary">
          Toggle Fullscreen
        </button>

        <div className="flex flex-wrap items-start flex-1 gap-3 min-w-0">
          <div className="flex flex-wrap content-start flex-1 min-w-[16rem] max-h-24 gap-2 overflow-auto">
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

          <div className="flex items-center justify-center flex-1 min-w-[16rem] p-4 rounded-md shadow-md bg-base-300 max-w-96">
            <div className="flex flex-col">
              <span className="ml-2 text-2xl font-bold font-performanceMode">
                {currentPreset?.number} | {currentPreset?.name || 'None'}
              </span>
              <span className="ml-2 text-sm opacity-70">
                {selectedMidiPort ? selectedMidiPort : 'No MIDI Port'} | Ch{' '}
                {selectedMidiChannel}
              </span>
              {activePlaylist && (
                <span className="flex items-center gap-1 ml-2 mt-1">
                  <span className="badge badge-accent badge-sm font-semibold">
                    {activePlaylist.name}
                  </span>
                  <button
                    className="btn btn-xs btn-ghost opacity-60 hover:opacity-100 px-1"
                    title="Clear setlist filter"
                    onClick={() => setActivePlaylistId(null)}
                  >
                    ✕
                  </button>
                </span>
              )}
            </div>
          </div>

          <Button
            onClick={() => setFavoritesOnly(!favoritesOnly)}
            variant="accent"
            size="lg"
          >
            {favoritesOnly ? 'Show All' : 'Show Favorites'}
          </Button>

          <div className="flex flex-col flex-1 min-w-[18rem] gap-2 p-3 rounded-md shadow-md bg-base-300 max-w-md">
            <div className="text-sm font-semibold">Performance Controls</div>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={handleToggleVibrato}
                variant={vibratoEnabled ? 'success' : 'secondary'}
                size="sm"
              >
                Vibrato {vibratoEnabled ? 'On' : 'Off'}
              </Button>
              <Button
                onClick={handleTogglePortamento}
                variant={portamentoEnabled ? 'success' : 'secondary'}
                size="sm"
              >
                Portamento {portamentoEnabled ? 'On' : 'Off'}
              </Button>
            </div>
            <label className="flex flex-col gap-1">
              <span className="text-xs opacity-80">
                Portamento Time (CC 05): {portamentoTime}
              </span>
              <input
                type="range"
                min={0}
                max={127}
                value={portamentoTime}
                className="range range-primary range-xs"
                onChange={(e) => handlePortamentoTimeChange(Number(e.target.value))}
              />
            </label>
            {controlMessage && (
              <div className="text-xs opacity-70">{controlMessage}</div>
            )}
          </div>
        </div>
      </div>
      <div className="flex h-full gap-4 pb-16">
        <div className="grid flex-grow grid-cols-2 grid-rows-4 gap-4 w-ful lg:grid-cols-4 lg:grid-rows-2 font-performanceMode">
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
        <div className="flex flex-col w-full gap-4 max-w-48">
          <button
            onClick={handlePreviousBank}
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
              onClick={handleOpenNumPad}
              className="btn btn-square btn-xl btn-primary"
            >
              <FaMagnifyingGlass size={32} />
            </button>
          </div>
          <button
            onClick={handleNextBank}
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
                  onClick={() => handleNumPadClick((num + 1).toString())}
                  className="text-3xl btn btn-primary"
                  disabled={parseInt(bankInput + (num + 1), 10) > totalBanks}
                >
                  {num + 1}
                </button>
              ))}
              <button
                onClick={handleClearNumPad}
                className="btn btn-secondary"
              >
                <FaX size={24} />
              </button>
              <button
                disabled={parseInt(bankInput + '0', 10) > totalBanks}
                onClick={() => handleNumPadClick('0')}
                className="text-3xl btn btn-primary"
              >
                0
              </button>
              <button
                onClick={handleSelectBank}
                className="col-span-1 text-xl btn btn-primary"
              >
                Select
              </button>
            </div>
            <button
              onClick={handleCloseNumPad}
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
