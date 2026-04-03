import { SortingState } from '@tanstack/react-table'

type PresetQueryKeyParams = {
  sorting: SortingState | []
  searchTerm: string
  selectedTags: string[]
  filterMode: 'inclusive' | 'exclusive'
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
    favoritesOnly,
    duplicatesOnly,
    randomOrder,
    shuffleSeed,
  ]
}