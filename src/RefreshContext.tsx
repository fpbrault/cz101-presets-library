import React, { createContext, useState, useContext } from 'react'
import { ReactNode } from 'react'

interface RefreshContextProps {
  refreshPresets: boolean
  triggerRefresh: () => void
}

const RefreshContext = createContext<RefreshContextProps | undefined>(undefined)

interface RefreshProviderProps {
  children: ReactNode
}

export const RefreshProvider: React.FC<RefreshProviderProps> = ({
  children,
}) => {
  const [refreshPresets, setRefreshPresets] = useState(false)

  const triggerRefresh = () => {
    setRefreshPresets((prev) => !prev)
  }

  return (
    <RefreshContext.Provider value={{ refreshPresets, triggerRefresh }}>
      {children}
    </RefreshContext.Provider>
  )
}

export const useRefresh = () => {
  const context = useContext(RefreshContext)
  if (!context) {
    throw new Error('useRefresh must be used within a RefreshProvider')
  }
  return context
}
