import { SortingState } from '@tanstack/react-table'
import React, { createContext, useState, useContext, ReactNode } from 'react'
import { loadFromLocalStorage, saveToLocalStorage } from '@/utils'

interface SearchFilterContextProps {
  sorting: SortingState | []
  setSorting: (sorting: SortingState) => void
  searchTerm: string
  setSearchTerm: (term: string) => void
  selectedTags: string[]
  setSelectedTags: (tags: string[]) => void
  filterMode: 'inclusive' | 'exclusive'
  setFilterMode: (mode: 'inclusive' | 'exclusive') => void
  favoritesOnly: boolean
  setFavoritesOnly: (favoritesOnly: boolean) => void
  randomOrder: boolean
  setRandomOrder: (randomOrder: boolean) => void
  duplicatesOnly: boolean
  setDuplicatesOnly: (duplicatesOnly: boolean) => void
  userPresetsOnly: boolean
  setUserPresetsOnly: (userPresetsOnly: boolean) => void
  activePlaylistId: string | null
  setActivePlaylistId: (id: string | null) => void
}

const SearchFilterContext = createContext<SearchFilterContextProps | undefined>(
  undefined,
)

interface SearchFilterProviderProps {
  children: ReactNode
}

export const SearchFilterProvider: React.FC<SearchFilterProviderProps> = ({
  children,
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [filterMode, setFilterMode] = useState<'inclusive' | 'exclusive'>(
    'inclusive',
  )

  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [sorting, setSorting] = useState<SortingState | []>([])
  const [randomOrder, setRandomOrder] = useState(false)
  const [duplicatesOnly, setDuplicatesOnly] = useState(false)
  const [userPresetsOnly, setUserPresetsOnlyState] = useState(
    loadFromLocalStorage('userPresetsOnly', false),
  )

  const setUserPresetsOnly = (nextValue: boolean) => {
    setUserPresetsOnlyState(nextValue)
    saveToLocalStorage('userPresetsOnly', nextValue)
  }

  const [activePlaylistId, setActivePlaylistId] = useState<string | null>(null)

  return (
    <SearchFilterContext.Provider
      value={{
        sorting,
        setSorting,
        searchTerm,
        setSearchTerm,
        selectedTags,
        setSelectedTags,
        filterMode,
        setFilterMode,
        favoritesOnly,
        setFavoritesOnly,
        randomOrder,
        setRandomOrder,
        duplicatesOnly,
        setDuplicatesOnly,
        userPresetsOnly,
        setUserPresetsOnly,
        activePlaylistId,
        setActivePlaylistId,
      }}
    >
      {children}
    </SearchFilterContext.Provider>
  )
}

export const useSearchFilter = () => {
  const context = useContext(SearchFilterContext)
  if (!context) {
    throw new Error(
      'useSearchFilter must be used within a SearchFilterProvider',
    )
  }
  return context
}
