import './App.css'

import { RefreshProvider } from './RefreshContext'
import PresetManager from './PresetManager'

export default function App() {
  return (
    <RefreshProvider>
      <PresetManager></PresetManager>
    </RefreshProvider>
  )
}
