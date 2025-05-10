import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
  memo,
} from 'react'
import { fetchPresetData, Preset, updatePreset } from './lib/presetManager'
import {
  FaPlusSquare,
  FaSort,
  FaSortUp,
  FaSortDown,
  FaHeart,
  FaRegHeart,
  FaTimes,
  FaStar,
  FaRegStar,
} from 'react-icons/fa'
import useDragDrop from './useDragDrop'
import {
  useReactTable,
  ColumnDef,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  SortingState,
  OnChangeFn,
} from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useSearchFilter } from './SearchFilterContext'
import {
  keepPreviousData,
  QueryClient,
  QueryClientProvider,
  useInfiniteQuery,
} from '@tanstack/react-query'

interface PresetListProps {
  currentPreset: Preset | null
  handleSelectPreset: (preset: Preset) => void
}

const fetchSize = 50

const TagsCell = memo(({ tags }: { tags: string[] }) => (
  <div className="flex gap-2">
    {tags.map((tag: string) => (
      <span key={tag} className="capitalize badge badge-primary">
        {tag.toLowerCase()}
      </span>
    ))}
  </div>
))

const RatingCell = memo(
  ({
    rating,
    handleSetRating,
    preset,
  }: {
    rating: 1 | 2 | 3 | 4 | 5 | undefined
    handleSetRating: (preset: Preset, rating: 1 | 2 | 3 | 4 | 5) => void
    preset: Preset
  }) => (
    <div>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          onMouseEnter={(e) => {
            const parent = e.currentTarget.parentElement
            if (parent) {
              const stars = parent.querySelectorAll('button')
              stars.forEach((s, i) => {
                if (i < star) s.classList.add('text-primary')
                else s.classList.remove('text-primary')
              })
            }
          }}
          onMouseLeave={(e) => {
            const parent = e.currentTarget.parentElement
            if (parent) {
              const stars = parent.querySelectorAll('button')
              stars.forEach((s, i) => {
                if (i < (rating || 0)) s.classList.add('text-primary')
                else s.classList.remove('text-primary')
              })
            }
          }}
          onClick={(e) => {
            e.stopPropagation()
            handleSetRating(preset, star as 1 | 2 | 3 | 4 | 5)
          }}
          className={`hover:text-primary transition-colors ${
            star <= (rating || 0) ? 'text-primary' : ''
          }`}
        >
          {star <= (rating || 0) ? (
            <FaStar size={16} />
          ) : (
            <FaRegStar size={16} />
          )}
        </button>
      ))}
    </div>
  ),
)

function PresetListTopBar(props: {
  searchTerm: string
  setSearchTerm: (arg0: string) => void
  totalDBRowCount: number
  randomOrder: boolean
  setRandomOrder: (arg0: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between bg-base-200">
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

      <button
        className="mx-4 my-2 btn btn-secondary"
        onClick={() => props.setRandomOrder(!props.randomOrder)}
      >
        {props.randomOrder ? 'Disable Random Order' : 'Enable Random Order'}
      </button>

      <div
        id="drop-area"
        className="p-2 mx-4 my-2 border-2 border-gray-400 border-dashed hover:bg-base-300 bg-base-100"
      >
        <FaPlusSquare size={20} className="inline mr-2"></FaPlusSquare>Drag and
        drop a .syx file or click here to add a new preset
      </div>
    </div>
  )
}

const shuffleArray = (array: any[], seed: number) => {
  let m = array.length,
    t,
    i
  while (m) {
    i = Math.floor(random(seed++) * m--)
    t = array[m]
    array[m] = array[i]
    array[i] = t
  }
  return array
}

const random = (seed: number) => {
  const x = Math.sin(seed++) * 10000
  return x - Math.floor(x)
}

const PresetList: React.FC<PresetListProps> = ({
  currentPreset,

  handleSelectPreset,
}) => {
  const tableContainerRef = useRef<HTMLDivElement>(null)

  const {
    searchTerm,
    selectedTags,
    filterMode,
    setSearchTerm,
    sorting,
    setSorting,
    randomOrder,
    setRandomOrder,
  } = useSearchFilter()
  const [shuffleSeed, setShuffleSeed] = useState<number>(Date.now())

  useEffect(() => {
    if (randomOrder) {
      setShuffleSeed(Date.now())
    }
  }, [randomOrder])

  const fetchData = async (
    start: number,
    size: number,
    sorting: SortingState,
  ) => {
    const result = await fetchPresetData(
      start,
      size,
      sorting,
      searchTerm,
      selectedTags,
      filterMode,
      false, // Add the missing favoritesOnly argument
      randomOrder,
      shuffleSeed,
    )
    return result
  }

  const queryKey = useMemo(
    () => [
      'presets',
      sorting,
      searchTerm,
      selectedTags,
      filterMode,
      randomOrder,
      shuffleSeed,
    ],
    [sorting, searchTerm, selectedTags, filterMode, randomOrder, shuffleSeed],
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
        header: 'No',
        accessorKey: 'number',
        size: 20,
        cell: ({ row }) => (
          <div className="flex items-center justify-center h-4">
            {row.index + 1}
          </div>
        ),
      },
      {
        header: 'Favorite',
        accessorKey: 'favorite',
        size: 5,
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
        size: 500,
        accessorKey: 'name',
      },
      {
        header: 'Author',
        accessorKey: 'author',
      },
      {
        header: 'Tags',
        accessorKey: 'tags',
        cell: ({ row }) => <TagsCell tags={row.original.tags} />,
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
    [handleSetFavorite, handleSetRating],
  )

  const { data, fetchNextPage, isFetching, refetch } = useInfiniteQuery<{
    presets: Preset[]
    totalCount: number
  }>({
    queryKey,
    queryFn: async ({ pageParam = 0 }) => {
      const start = (pageParam as number) * fetchSize
      const fetchedData = await fetchData(start, fetchSize, sorting) //pretend api call
      return fetchedData
    },
    initialPageParam: 0,
    getNextPageParam: (_lastGroup, groups) => groups.length,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  })

  useEffect(() => {
    refetch()
  }, [searchTerm, selectedTags, filterMode, refetch])

  const flatData = React.useMemo(() => {
    let flatData =
      data?.pages?.flatMap((page: { presets: any }) => page.presets) ?? []
    if (randomOrder) {
      flatData = shuffleArray(flatData, shuffleSeed)
    }
    return flatData
  }, [data, randomOrder, shuffleSeed])

  const totalDBRowCount = data?.pages?.[0]?.totalCount ?? 0
  const totalFetched = flatData.length

  useDragDrop()

  const [visualSelectedId, setVisualSelectedId] = useState<string | null>(null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
  }, [currentPreset, flatData, handleSelectPreset, visualSelectedId])

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
    state: {
      sorting,
    },
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
        randomOrder={randomOrder}
        setRandomOrder={setRandomOrder}
      ></PresetListTopBar>
      <div
        className="max-h-full overflow-auto"
        onScroll={(e) => fetchMoreOnBottomReached(e.target as HTMLDivElement)}
        ref={tableContainerRef}
      >
        <table className="relative table table-lg">
          <thead className="sticky top-0 bg-base-300">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr
                key={headerGroup.id}
                className="text-xl w-full fle justiy-between"
              >
                {headerGroup.headers.map((column) => (
                  <th
                    key={column.id}
                    style={{ width: column.column.getSize() + 'px' }}
                    onClick={column.column.getToggleSortingHandler()}
                    className={`${
                      column.column.getIsSorted()
                        ? column.column.getIsSorted() === 'desc'
                          ? 'font-bold text-primary'
                          : 'font-bold text-primary'
                        : 'font-normal'
                    }`}
                  >
                    {flexRender(
                      column.column.columnDef.header,
                      column.getContext(),
                    )}
                    <span>
                      {column.column.getIsSorted() ? (
                        column.column.getIsSorted() === 'desc' ? (
                          <FaSortDown className="inline" />
                        ) : (
                          <FaSortUp className="inline" />
                        )
                      ) : (
                        <FaSort className="inline" />
                      )}
                    </span>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody
            style={{
              width: '100%',
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
                      width: '100%',
                    }}
                    onClick={() => handleSelectPreset(row.original)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        style={{
                          width: cell.column.getSize(),
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

const queryClient = new QueryClient()

const PresetListWrapper: React.FC<PresetListProps> = (props) => (
  <QueryClientProvider client={queryClient}>
    <PresetList {...props} />
  </QueryClientProvider>
)

export default PresetListWrapper
