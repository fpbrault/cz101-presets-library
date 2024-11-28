import { SortingState } from '@tanstack/react-table'
import React, { createContext, useState, useContext, ReactNode } from 'react'

interface SearchFilterContextProps {
  sorting: SortingState | []
  setSorting: (sorting: SortingState) => void
  searchTerm: string
  setSearchTerm: (term: string) => void
  selectedTags: string[]
  setSelectedTags: (tags: string[]) => void
  filterMode: 'inclusive' | 'exclusive'
  setFilterMode: (mode: 'inclusive' | 'exclusive') => void
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

  const [sorting, setSorting] = useState<SortingState | []>([])

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
