import './App.css'

import { RefreshProvider } from './RefreshContext'
import PresetManager from './PresetManager'
import { SearchFilterProvider } from './SearchFilterContext'

export default function App() {
  return (
    <RefreshProvider>
      <SearchFilterProvider>
        <PresetManager></PresetManager>
      </SearchFilterProvider>
    </RefreshProvider>
  )
}
