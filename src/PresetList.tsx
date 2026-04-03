import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
  memo,
} from 'react'
import {
  deletePreset,
  deleteTagGlobally,
  fetchPresetData,
  Preset,
  renameTagGlobally,
  updatePreset,
} from '@/lib/presetManager'
import {
  FaPlusSquare,
  FaSortUp,
  FaSortDown,
  FaRandom,
  FaHeart,
  FaRegHeart,
  FaTimes,
  FaCheckCircle,
  FaRegDotCircle,
  FaTrash,
  FaTags,
  FaChevronDown,
  FaChevronUp,
  FaCopy,
} from 'react-icons/fa'
import useDragDrop from '@/useDragDrop'
import {
  useReactTable,
  ColumnDef,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  SortingState,
  OnChangeFn,
  ColumnResizeMode,
} from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useSearchFilter } from '@/SearchFilterContext'
import {
  keepPreviousData,
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { getPresetQueryKey } from '@/lib/presetQueryKey'
import TagManagerModal from '@/features/presets/components/TagManagerModal'
import DuplicateReviewModal, {
  DuplicateGroup,
} from '@/features/presets/components/DuplicateReviewModal'

interface PresetListProps {
  currentPreset: Preset | null
  handleSelectPreset: (preset: Preset) => void
  handleActivatePreset?: (preset: Preset) => void
}

const fetchSize = 50

const getColumnStyle = (size: number) => ({
  width: size,
  minWidth: size,
  maxWidth: size,
  flex: `0 0 ${size}px`,
})

const isCompactColumn = (columnId: string) =>
  columnId === 'number' || columnId === 'favorite'

const TagsCell = memo(({ tags }: { tags: string[] }) => (
  <div className="flex gap-2">
    {tags.map((tag: string) => (
      <span key={tag} className="capitalize badge badge-primary">
        {tag.toLowerCase()}
      </span>
    ))}
  </div>
))

// const RatingCell = memo(
//   ({
//     rating,
//     handleSetRating,
//     preset,
//   }: {
//     rating: 1 | 2 | 3 | 4 | 5 | undefined
//     handleSetRating: (preset: Preset, rating: 1 | 2 | 3 | 4 | 5) => void
//     preset: Preset
//   }) => (
//     <div>
//       {[1, 2, 3, 4, 5].map((star) => (
//         <button
//           key={star}
//           onMouseEnter={(e) => {
//             const parent = e.currentTarget.parentElement
//             if (parent) {
//               const stars = parent.querySelectorAll('button')
//               stars.forEach((s, i) => {
//                 if (i < star) s.classList.add('text-primary')
//                 else s.classList.remove('text-primary')
//               })
//             }
//           }}
//           onMouseLeave={(e) => {
//             const parent = e.currentTarget.parentElement
//             if (parent) {
//               const stars = parent.querySelectorAll('button')
//               stars.forEach((s, i) => {
//                 if (i < (rating || 0)) s.classList.add('text-primary')
//                 else s.classList.remove('text-primary')
//               })
//             }
//           }}
//           onClick={(e) => {
//             e.stopPropagation()
//             handleSetRating(preset, star as 1 | 2 | 3 | 4 | 5)
//           }}
//           className={`hover:text-primary transition-colors ${
//             star <= (rating || 0) ? 'text-primary' : ''
//           }`}
//         >
//           {star <= (rating || 0) ? (
//             <FaStar size={16} />
//           ) : (
//             <FaRegStar size={16} />
//           )}
//         </button>
//       ))}
//     </div>
//   ),
// )

function PresetListTopBar(props: {
  searchTerm: string
  setSearchTerm: (arg0: string) => void
  totalDBRowCount: number
  selectedTags: string[]
  filterMode: 'inclusive' | 'exclusive'
  onToggleFilterMode: () => void
  onClearFilters: () => void
  onToggleTag: (tag: string) => void
  availableTags: [string, number][]
  duplicatesOnly: boolean
  onToggleDuplicatesOnly: () => void
  onOpenTagManager: () => void
  duplicateGroupCount: number
  onOpenDuplicateReview: () => void
}) {
  const [isTagsPanelOpen, setIsTagsPanelOpen] = useState(false)

  return (
    <div className="relative border-b bg-base-200 border-base-content/10">
      <div className="flex items-center justify-between">
        <div className="relative inline-block">
          <input
            type="text"
            placeholder="Search..."
            value={props.searchTerm}
            onChange={(e) => props.setSearchTerm(e.target.value)}
            className="pr-8 mx-4 my-2 input input-secondary input-md"
          />
          {props.searchTerm && (
            <button
              className="absolute text-gray-500 -translate-y-1/2 right-6 top-1/2 hover:text-gray-700"
              onClick={() => props.setSearchTerm('')}
            >
              <FaTimes size={20} />
            </button>
          )}
        </div>

        <span>{props.totalDBRowCount} Presets Found</span>

        <div className="flex items-center gap-2 mx-4 my-2">
          <button
            className={`btn btn-sm sm:btn-md normal-case font-semibold shadow-md ${
              props.duplicatesOnly ? 'btn-warning' : 'btn-neutral'
            }`}
            onClick={props.onToggleDuplicatesOnly}
            title="Show only duplicate SysEx presets"
          >
            <FaCopy size={12} />
            Duplicates
          </button>

          <button
            className="btn btn-sm sm:btn-md normal-case font-semibold shadow-md btn-neutral"
            onClick={props.onOpenDuplicateReview}
            title="Review and clean duplicate presets"
            disabled={props.duplicateGroupCount === 0}
          >
            Review Duplicates
            {props.duplicateGroupCount > 0 && (
              <span className="badge badge-warning badge-sm">
                {props.duplicateGroupCount}
              </span>
            )}
          </button>

          <button
            className="btn btn-sm sm:btn-md normal-case font-semibold shadow-md btn-neutral"
            onClick={props.onOpenTagManager}
            title="Rename, merge, or delete tags globally"
          >
            Manage Tags
          </button>

          <button
            className={`btn btn-sm sm:btn-md normal-case font-semibold shadow-md ${
              isTagsPanelOpen
                ? 'btn-primary ring-2 ring-primary/40'
                : 'btn-accent text-accent-content'
            }`}
            onClick={() => setIsTagsPanelOpen((open) => !open)}
            aria-expanded={isTagsPanelOpen}
            aria-label="Toggle tag filters"
          >
            <FaTags size={14} />
            Tag Filters
            {props.selectedTags.length > 0 && (
              <span className="badge badge-primary badge-sm">
                {props.selectedTags.length} selected
              </span>
            )}
            {isTagsPanelOpen ? <FaChevronUp size={12} /> : <FaChevronDown size={12} />}
          </button>

          <div
            id="drop-area"
            className="hidden p-2 border-2 border-gray-400 border-dashed lg:block hover:bg-base-300 bg-base-100"
          >
            <FaPlusSquare size={20} className="inline mr-2"></FaPlusSquare>
            Drag and drop a .syx file or click here to add a new preset
          </div>
        </div>
      </div>

      {isTagsPanelOpen && (
        <>
          <button
            className="fixed inset-0 z-30 cursor-default bg-black/30"
            onClick={() => setIsTagsPanelOpen(false)}
            aria-label="Close tag filters"
          />
          <div className="absolute left-2 right-2 z-40 p-3 mt-2 border shadow-xl sm:left-4 sm:right-4 lg:left-auto lg:right-4 lg:w-[44rem] rounded-xl bg-base-100 border-base-content/20">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h3 className="text-lg font-semibold">Tag Filters</h3>
              <button
                onClick={() => setIsTagsPanelOpen(false)}
                className="btn btn-sm btn-ghost"
                aria-label="Close tags panel"
              >
                <FaTimes size={14} />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 mb-3">
              <button
                onClick={props.onToggleFilterMode}
                className="btn btn-sm btn-info"
                title={
                  props.filterMode === 'exclusive'
                    ? 'Matching any selected tag'
                    : 'Matching all selected tags'
                }
              >
                {props.filterMode === 'exclusive' ? (
                  <>
                    Match Any
                    <FaRegDotCircle size={14} />
                  </>
                ) : (
                  <>
                    Match All
                    <FaCheckCircle size={14} />
                  </>
                )}
              </button>
              <button
                onClick={props.onClearFilters}
                className="btn btn-sm btn-error"
                disabled={props.selectedTags.length === 0}
              >
                Clear
                <FaTrash size={12} />
              </button>
            </div>

            <div className="max-h-[50vh] overflow-y-auto pr-1">
              <div className="flex flex-wrap items-center gap-2">
                {props.availableTags.map(([tag, count]) => {
                  const selected = props.selectedTags.includes(tag)
                  return (
                    <button
                      key={tag}
                      onClick={() => props.onToggleTag(tag)}
                      className={`badge badge-lg h-10 px-4 text-sm font-semibold capitalize ${
                        selected
                          ? 'badge-primary'
                          : 'badge-neutral border-base-content/20'
                      }`}
                    >
                      {tag} ({count})
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </>
      )}

      {props.selectedTags.length > 0 && (
        <div className="flex items-center gap-2 px-4 pb-3 overflow-x-auto">
          {props.selectedTags.map((tag) => (
            <button
              key={tag}
              onClick={() => props.onToggleTag(tag)}
              className="badge badge-primary badge-lg h-8 capitalize"
              title="Tap to remove"
            >
              {tag}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

const PresetList: React.FC<PresetListProps> = ({
  currentPreset,

  handleSelectPreset,
  handleActivatePreset,
}) => {
  const queryClient = useQueryClient()
  const tableContainerRef = useRef<HTMLDivElement>(null)

  const {
    searchTerm,
    selectedTags,
    setSelectedTags,
    filterMode,
    setFilterMode,
    favoritesOnly,
    setSearchTerm,
    sorting,
    setSorting,
    randomOrder,
    setRandomOrder,
    duplicatesOnly,
    setDuplicatesOnly,
  } = useSearchFilter()
  const [shuffleSeed, setShuffleSeed] = useState<number>(Date.now())
  const [columnResizeMode] = useState<ColumnResizeMode>('onChange')
  const [isTagManagerOpen, setIsTagManagerOpen] = useState(false)
  const [isDuplicateReviewOpen, setIsDuplicateReviewOpen] = useState(false)

  useEffect(() => {
    if (randomOrder) {
      setShuffleSeed(Date.now())
      if (sorting.length > 0) {
        setSorting([])
      }
    }
  }, [randomOrder, setSorting, sorting.length])

  const effectiveSorting = useMemo<SortingState>(
    () => (sorting.length > 0 ? sorting : [{ id: 'name', desc: false }]),
    [sorting],
  )
  const favoriteSortEnabled = sorting[0]?.id === 'favorite'

  const fetchData = async (
    start: number,
    size: number,
    sorting: SortingState,
  ) => {
    const result = await fetchPresetData(
      start,
      size,
      randomOrder ? [] : sorting,
      searchTerm,
      selectedTags,
      filterMode,
      favoritesOnly,
      randomOrder,
      shuffleSeed,
      duplicatesOnly,
    )
    return result
  }

  const queryKey = useMemo(
    () =>
      getPresetQueryKey({
        sorting: randomOrder ? [] : effectiveSorting,
        searchTerm,
        selectedTags,
        filterMode,
        favoritesOnly,
        duplicatesOnly,
        randomOrder,
        shuffleSeed,
      }),
    [
      effectiveSorting,
      searchTerm,
      selectedTags,
      filterMode,
      favoritesOnly,
      duplicatesOnly,
      randomOrder,
      shuffleSeed,
    ],
  )

  const updateQueryData = useCallback(
    (preset: Preset, updates: Partial<Preset>) => {
      queryClient.setQueryData(
        queryKey,
        (old: {
          pageParams: any
          pages: { presets: Preset[]; totalCount: number }[]
        }) => {
          if (!old?.pages) return old
          const updatedPages = old.pages.map((page) => ({
            ...page,
            presets: page.presets.map((p) =>
              p.id === preset.id ? { ...p, ...updates } : p,
            ),
          }))
          return {
            ...old,
            pages: updatedPages,
          }
        },
      )
    },
    [queryKey],
  )

  const handleSetFavorite = useCallback(
    async (preset: Preset) => {
      const newFavorite = !preset.favorite
      updateQueryData(preset, { favorite: newFavorite })

      try {
        await updatePreset({
          ...preset,
          favorite: newFavorite,
        })
      } catch (error) {
        updateQueryData(preset, { favorite: preset.favorite })
      }
    },
    [updateQueryData],
  )

  const handleSetRating = useCallback(
    async (preset: Preset, rating: 1 | 2 | 3 | 4 | 5) => {
      updateQueryData(preset, { rating })

      try {
        await updatePreset({
          ...preset,
          rating,
        })
      } catch (error) {
        updateQueryData(preset, { rating: preset.rating })
      }
    },
    [updateQueryData],
  )

  const columns = useMemo<ColumnDef<Preset>[]>(
    () => [
      {
        header: () => <FaHeart size={18} className="text-primary" />,
        accessorKey: 'favorite',
        enableSorting: false,
        size: 96,
        minSize: 112,
        cell: ({ row }) => (
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleSetFavorite(row.original)
            }}
          >
            {row.original.favorite ? (
              <FaHeart
                size={20}
                className="hover:text-base-content text-primary"
              />
            ) : (
              <FaRegHeart size={20} className="hover:text-primary" />
            )}
          </button>
        ),
      },
      {
        header: 'Name',
        size: 360,
        accessorKey: 'name',
      },
      {
        header: 'Author',
        accessorKey: 'author',
        size: 220,
      },
      {
        header: 'Tags',
        accessorKey: 'tags',
        size: 320,
        cell: ({ row }) => <TagsCell tags={row.original.tags} />,
      },
      {
        id: 'randomOrder',
        header: () => (
          <button
            onClick={(e) => {
              e.stopPropagation()
              setRandomOrder(!randomOrder)
            }}
            className={`btn btn-ghost btn-sm ${
              randomOrder ? 'text-primary' : 'opacity-70'
            }`}
            title={randomOrder ? 'Disable random order' : 'Enable random order'}
            aria-label={
              randomOrder ? 'Disable random order' : 'Enable random order'
            }
          >
            <FaRandom size={16} />
          </button>
        ),
        enableSorting: false,
        size: 112,
        cell: () => null,
      },
      /*     {
        header: 'Rating',
        accessorKey: 'rating',
        cell: ({ row }) => (
          <RatingCell
            rating={row.original.rating}
            handleSetRating={handleSetRating}
            preset={row.original}
          />
        ),
      }, */
    ],
    [handleSetFavorite, handleSetRating, randomOrder, setRandomOrder],
  )

  const { data: duplicatePresetsData } = useQuery({
    queryKey: ['presets', 'duplicate-review'],
    queryFn: async () => {
      const result = await fetchPresetData(
        0,
        Number.MAX_SAFE_INTEGER,
        [],
        '',
        [],
        'inclusive',
        false,
        false,
        0,
        true,
      )
      return result.presets
    },
    refetchOnWindowFocus: false,
  })

  const duplicateGroups = useMemo<DuplicateGroup[]>(() => {
    const presets = duplicatePresetsData ?? []
    const grouped = presets.reduce(
      (acc, preset) => {
        const key = Array.from(preset.sysexData).join(',')
        if (!acc[key]) {
          acc[key] = []
        }
        acc[key].push(preset)
        return acc
      },
      {} as Record<string, Preset[]>,
    )

    return Object.entries(grouped).map(([fingerprint, groupedPresets]) => ({
      fingerprint,
      presets: [...groupedPresets].sort((a, b) => {
        const favoriteDelta = Number(Boolean(b.favorite)) - Number(Boolean(a.favorite))
        if (favoriteDelta !== 0) {
          return favoriteDelta
        }

        return a.name.localeCompare(b.name)
      }),
    }))
  }, [duplicatePresetsData])

  const handleToggleFilterMode = useCallback(() => {
    if (filterMode === 'inclusive') {
      setFilterMode('exclusive')
    } else {
      setFilterMode('inclusive')
    }
  }, [filterMode, setFilterMode])

  const handleToggleTag = useCallback(
    (tag: string) => {
      if (selectedTags.includes(tag)) {
        setSelectedTags(selectedTags.filter((selectedTag) => selectedTag !== tag))
      } else {
        setSelectedTags([...selectedTags, tag])
      }
    },
    [selectedTags, setSelectedTags],
  )

  const handleClearFilters = useCallback(() => {
    setSelectedTags([])
  }, [setSelectedTags])

  const handleToggleDuplicatesOnly = useCallback(() => {
    setDuplicatesOnly(!duplicatesOnly)
  }, [duplicatesOnly, setDuplicatesOnly])

  const handleRenameOrMergeTag = useCallback(
    async (sourceTag: string, targetTag: string) => {
      await renameTagGlobally(sourceTag, targetTag)
      await queryClient.invalidateQueries({ queryKey: ['presets'] })
    },
    [queryClient],
  )

  const handleDeleteTag = useCallback(
    async (tag: string) => {
      await deleteTagGlobally(tag)
      await queryClient.invalidateQueries({ queryKey: ['presets'] })
      if (selectedTags.includes(tag)) {
        setSelectedTags(selectedTags.filter((selectedTag) => selectedTag !== tag))
      }
    },
    [queryClient, selectedTags, setSelectedTags],
  )

  const handleDeleteDuplicatePresets = useCallback(
    async (ids: string[]) => {
      await Promise.all(ids.map((id) => deletePreset(id)))
      await queryClient.invalidateQueries({ queryKey: ['presets'] })
    },
    [queryClient],
  )

  const { data, fetchNextPage, isFetching } = useInfiniteQuery<{
    presets: Preset[]
    totalCount: number
  }>({
    queryKey,
    queryFn: async ({ pageParam = 0 }) => {
      const start = (pageParam as number) * fetchSize
      const fetchedData = await fetchData(start, fetchSize, effectiveSorting) //pretend api call
      return fetchedData
    },
    initialPageParam: 0,
    getNextPageParam: (_lastGroup, groups) => groups.length,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  })

  const flatData = React.useMemo(() => {
    return data?.pages?.flatMap((page: { presets: any }) => page.presets) ?? []
  }, [data])

  const availableTags = useMemo<[string, number][]>(() => {
    const cachedQueryData = queryClient.getQueriesData({
      queryKey: ['presets'],
    })

    const cachedPresets: Preset[] = cachedQueryData.flatMap(
      ([, queryData]): Preset[] => {
      if (!queryData || typeof queryData !== 'object') {
        return []
      }

      const candidate = queryData as {
        pages?: Array<{ presets?: Preset[] }>
        presets?: Preset[]
      }

      if (Array.isArray(candidate.pages)) {
          return candidate.pages.flatMap((page) => page.presets ?? [])
      }

      if (Array.isArray(candidate.presets)) {
        return candidate.presets
      }

      return []
      },
    )

    const presets = cachedPresets.length > 0 ? cachedPresets : flatData
    const tagCounts: Record<string, number> = {}

    presets.forEach((preset) => {
      preset.tags.forEach((tag: string) => {
        const normalizedTag = tag.toLowerCase()
        tagCounts[normalizedTag] = (tagCounts[normalizedTag] ?? 0) + 1
      })
    })

    return Object.entries(tagCounts).sort((a, b) => b[1] - a[1])
  }, [flatData, queryClient])

  const totalDBRowCount = data?.pages?.[0]?.totalCount ?? 0
  const totalFetched = flatData.length

  useDragDrop()

  const [visualSelectedId, setVisualSelectedId] = useState<string | null>(null)

  useEffect(() => {
    const isTextInputTarget = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) {
        return false
      }

      const tagName = target.tagName
      return (
        target.isContentEditable ||
        tagName === 'INPUT' ||
        tagName === 'TEXTAREA' ||
        tagName === 'SELECT'
      )
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isTextInputTarget(e.target)) {
        return
      }

      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault()

        const currentIndex = flatData.findIndex(
          (preset: { id: string | undefined }) =>
            preset.id === (visualSelectedId ?? currentPreset?.id),
        )

        let nextIndex = currentIndex
        if (e.key === 'ArrowUp' && currentIndex > 0) {
          nextIndex = currentIndex - 1
        } else if (
          e.key === 'ArrowDown' &&
          currentIndex < flatData.length - 1
        ) {
          nextIndex = currentIndex + 1
        }

        if (nextIndex !== currentIndex) {
          // Update visual selection only
          setVisualSelectedId(flatData[nextIndex].id)

          setTimeout(() => {
            const row = document.querySelector(`tr[data-index="${nextIndex}"]`)
            if (row) {
              row.scrollIntoView({
                behavior: 'instant',
                block: 'nearest',
              })
            }
          }, 0)
        }
      }

      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()

        const activePreset =
          flatData.find((preset: Preset) => preset.id === visualSelectedId) ||
          flatData.find((preset: Preset) => preset.id === currentPreset?.id) ||
          flatData[0]

        if (activePreset) {
          if (handleActivatePreset) {
            handleActivatePreset(activePreset)
          } else {
            handleSelectPreset(activePreset)
          }
          setVisualSelectedId(null)
        }
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        // Only load preset when key is released
        if (visualSelectedId) {
          const preset = flatData.find(
            (p: { id: string }) => p.id === visualSelectedId,
          )
          if (preset) {
            handleSelectPreset(preset)
            setVisualSelectedId(null)
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [
    currentPreset,
    flatData,
    handleSelectPreset,
    handleActivatePreset,
    visualSelectedId,
  ])

  const fetchMoreOnBottomReached = React.useCallback(
    (containerRefElement?: HTMLDivElement | null) => {
      if (containerRefElement) {
        const { scrollHeight, scrollTop, clientHeight } = containerRefElement
        //once the user has scrolled within 500px of the bottom of the table, fetch more data if we can
        if (
          scrollHeight - scrollTop - clientHeight < 500 &&
          !isFetching &&
          totalFetched < totalDBRowCount
        ) {
          fetchNextPage()
        }
      }
    },
    [fetchNextPage, isFetching, totalFetched, totalDBRowCount],
  )

  useEffect(() => {
    fetchMoreOnBottomReached(tableContainerRef.current)
  }, [fetchMoreOnBottomReached])

  const table = useReactTable({
    data: flatData,
    columns,
    defaultColumn: {
      minSize: 112,
    },
    state: {
      sorting: randomOrder ? [] : effectiveSorting,
    },
    columnResizeMode,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualSorting: true,
    debugTable: false,
  })
  const handleSortingChange: OnChangeFn<SortingState> = (updater) => {
    setSorting(updater as SortingState)
    if (!!table.getRowModel().rows.length) {
      rowVirtualizer.scrollToIndex?.(0)
    }
  }

  //since this table option is derived from table row model state, we're using the table.setOptions utility
  table.setOptions((prev) => ({
    ...prev,
    onSortingChange: handleSortingChange,
  }))

  const { rows } = table.getRowModel()

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    estimateSize: () => 33,
    getScrollElement: () => tableContainerRef.current,
    measureElement:
      typeof window !== 'undefined' &&
      navigator.userAgent.indexOf('Firefox') === -1
        ? (element) => element?.getBoundingClientRect().height
        : undefined,
    overscan: 5,
  })

  return (
    <div className="flex flex-col flex-grow select-none bg-base-300">
      <PresetListTopBar
        totalDBRowCount={totalDBRowCount}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        selectedTags={selectedTags}
        filterMode={filterMode}
        onToggleFilterMode={handleToggleFilterMode}
        onClearFilters={handleClearFilters}
        onToggleTag={handleToggleTag}
        availableTags={availableTags}
        duplicatesOnly={duplicatesOnly}
        onToggleDuplicatesOnly={handleToggleDuplicatesOnly}
        onOpenTagManager={() => setIsTagManagerOpen(true)}
        duplicateGroupCount={duplicateGroups.length}
        onOpenDuplicateReview={() => setIsDuplicateReviewOpen(true)}
      ></PresetListTopBar>
      <TagManagerModal
        isOpen={isTagManagerOpen}
        availableTags={availableTags}
        onClose={() => setIsTagManagerOpen(false)}
        onRenameOrMerge={handleRenameOrMergeTag}
        onDeleteTag={handleDeleteTag}
      />
      <DuplicateReviewModal
        isOpen={isDuplicateReviewOpen}
        groups={duplicateGroups}
        onClose={() => setIsDuplicateReviewOpen(false)}
        onDeletePresets={handleDeleteDuplicatePresets}
      />
      <div
        className="relative max-h-full overflow-auto"
        onScroll={(e) => fetchMoreOnBottomReached(e.target as HTMLDivElement)}
        ref={tableContainerRef}
      >
        <table
          className="table table-lg min-w-full border-separate border-spacing-0"
          style={{ width: table.getTotalSize() }}
        >
          <thead className="sticky top-0 z-20 bg-base-300 shadow-sm">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr
                key={headerGroup.id}
                className="flex w-full text-xl group"
              >
                {headerGroup.headers.map((column) => (
                  <th
                    key={column.id}
                    style={getColumnStyle(column.column.getSize())}
                    onClick={
                      column.column.id === 'favorite'
                        ? () => {
                            if (randomOrder) {
                              setRandomOrder(false)
                            }
                            if (favoriteSortEnabled) {
                              setSorting([])
                            } else {
                              setSorting([{ id: 'favorite', desc: true }])
                            }
                          }
                        : column.column.getCanSort()
                        ? (e) => {
                            if (randomOrder) {
                              setRandomOrder(false)
                            }
                            column.column.getToggleSortingHandler()?.(e)
                          }
                        : undefined
                    }
                    className="relative bg-base-300"
                  >
                    <div
                      className={`flex items-center py-3 ${
                        isCompactColumn(column.column.id)
                          ? 'justify-center gap-1 px-2'
                          : 'gap-1 px-4'
                      } ${
                        column.column.id === 'favorite'
                          ? favoriteSortEnabled
                            ? 'font-bold text-primary'
                            : 'font-normal'
                          : column.column.getIsSorted()
                          ? 'font-bold text-primary'
                          : 'font-normal'
                      }`}
                    >
                      {column.column.id === 'favorite' ? (
                        <>
                          {favoriteSortEnabled ? (
                            <FaHeart size={20} className="text-primary" />
                          ) : (
                            <FaRegHeart size={20} className="opacity-70" />
                          )}
                        </>
                      ) : column.column.id === 'randomOrder' ? (
                        flexRender(
                          column.column.columnDef.header,
                          column.getContext(),
                        )
                      ) : (
                        <>
                          {flexRender(
                            column.column.columnDef.header,
                            column.getContext(),
                          )}
                          {!randomOrder && column.column.getIsSorted() && (
                            <span>
                              {column.column.getIsSorted() === 'desc' ? (
                                <FaSortDown className="inline" />
                              ) : (
                                <FaSortUp className="inline" />
                              )}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                    <div
                      onClick={(e) => e.stopPropagation()}
                      onDoubleClick={() => column.column.resetSize()}
                      onMouseDown={column.getResizeHandler()}
                      onTouchStart={column.getResizeHandler()}
                      className={`absolute top-0 right-0 h-full w-1 cursor-col-resize touch-none select-none hover:bg-primary transition-opacity ${
                        column.column.getIsResizing()
                          ? 'bg-primary opacity-100'
                          : 'bg-base-content/20 opacity-0 group-hover:opacity-100'
                      }`}
                    />
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody
            className="relative block w-full"
            style={{
              width: table.getTotalSize(),
              height: `${rowVirtualizer.getTotalSize()}px`,
              position: 'relative',
            }}
          >
            {!isFetching &&
              rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const row = rows[virtualRow.index]
                if (!row.original) return null // Ensure row.original is defined
                return (
                  <tr
                    data-index={virtualRow.index}
                    ref={(node) => rowVirtualizer.measureElement(node)}
                    key={row.id}
                    className={
                      'justifybetween ' +
                      (visualSelectedId === row.original.id ||
                      (!visualSelectedId &&
                        currentPreset?.id === row.original.id)
                        ? 'bg-base-100'
                        : '')
                    }
                    style={{
                      display: 'flex',
                      position: 'absolute',
                      transform: `translateY(${virtualRow.start}px)`,
                      width: table.getTotalSize(),
                    }}
                    onClick={() => handleSelectPreset(row.original)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className={
                          isCompactColumn(cell.column.id)
                            ? 'px-2 py-2 text-center'
                            : 'px-4 py-2'
                        }
                        style={{
                          ...getColumnStyle(cell.column.getSize()),
                        }}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </td>
                    ))}
                  </tr>
                )
              })}
            {isFetching && (
              <tr>
                <td
                  colSpan={table.getAllColumns().length}
                  className="text-center"
                >
                  Fetching More...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default PresetList
