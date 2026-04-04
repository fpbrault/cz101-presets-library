import { SortingState } from '@tanstack/react-table'

type PresetQueryKeyParams = {
  sorting: SortingState | []
  searchTerm: string
  selectedTags: string[]
  filterMode: 'inclusive' | 'exclusive'
  userPresetsOnly?: boolean
  favoritesOnly: boolean
  duplicatesOnly?: boolean
  randomOrder: boolean
  shuffleSeed?: number
}

export function getPresetQueryKey({
  sorting,
  searchTerm,
  selectedTags,
  filterMode,
  userPresetsOnly,
  favoritesOnly,
  duplicatesOnly,
  randomOrder,
  shuffleSeed,
}: PresetQueryKeyParams) {
  return [
    'presets',
    sorting,
    searchTerm,
    selectedTags,
    filterMode,
    userPresetsOnly,
    favoritesOnly,
    duplicatesOnly,
    randomOrder,
    shuffleSeed,
  ]
}