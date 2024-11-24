import React, { useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { Preset } from './lib/presetManager'
import { FaPlusSquare, FaSort, FaSortUp, FaSortDown } from 'react-icons/fa'

interface PresetListProps {
  currentPreset: Preset | null
  filteredPresets: Preset[]
  handleRowClick: (e: React.MouseEvent<HTMLTableRowElement>) => void
}

const PresetList: React.FC<PresetListProps> = ({
  currentPreset,
  filteredPresets,
  handleRowClick,
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
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? -1 : 1
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
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
      preset.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
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

  return (
    <div className="overflow-auto flex-grow bg-base-300">
      <div className="flex justify-between bg-base-200 items-center">
        <div>
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input input-secondary input-md mx-4 my-2"
          />

          <span>{filteredAndSortedPresets.length} Presets Found</span>
        </div>
        <div
          id="drop-area"
          className="border-dashed border-2 border-gray-400 p-2 my-2 hover:bg-base-300 bg-base-100 mx-4"
        >
          <FaPlusSquare size={20} className="inline mr-2"></FaPlusSquare>Drag
          and drop a .syx file or click here to add a new preset
        </div>
      </div>
      <table className="relative table table-lg">
        <thead className="sticky top-0 bg-base-300">
          <tr>
            <th className="hidden"></th>
            <th onClick={() => requestSort('name')}>
              Name {getSortIcon('name')}
            </th>
            <th onClick={() => requestSort('filename')}>
              Path {getSortIcon('filename')}
            </th>
            <th>Tags</th>
          </tr>
        </thead>
        <tbody>
          {filteredAndSortedPresets.map((preset) => (
            <tr
              key={preset.id}
              className={currentPreset?.id === preset.id ? 'bg-base-200' : ''}
              onClick={handleRowClick}
            >
              <td className="hidden">{preset.id}</td>
              <td className="font-bold text-xl">{preset.name}</td>
              <td>{preset.filename}</td>
              <td className="flex gap-2">
                {preset.tags.map((tag: string) => (
                  <span key={uuidv4()} className="badge badge-primary">
                    {tag}
                  </span>
                ))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default PresetList
