import { WebMidi, Output, Input } from 'webmidi'
import natsort from 'natsort'
//import { FakePresetDatabase } from './fakePresetDatabase'
import { IndexedDbPresetDatabase } from './browserDatabase'

import { exists, mkdir, readFile, readTextFile, writeFile, writeTextFile, BaseDirectory, readDir, DirEntry } from '@tauri-apps/plugin-fs'
import { v4 as uuidv4 } from 'uuid'

let presetDatabase: PresetDatabase

const REQUEST_COMMANDS = Array.from(
  { length: 16 },
  (_, i) => new Uint8Array([240, 68, 0, 0, 112, 16, i + 32, 112, 49, 247]),
)
const BACKUP_FOLDER = 'cz101_backup'
const CONFIG_FILE = 'config.json'

if (typeof window !== 'undefined' && (window as any).__TAURI__) {
  console.log('Running in Tauri')
  // Running in Tauri
  presetDatabase = new IndexedDbPresetDatabase()
} else {
  console.log('Running in a browser')
  // Running in a browser
  presetDatabase = new IndexedDbPresetDatabase()
}

export async function syncPresets(): Promise<void> {
  try {
    const localPresets = await presetDatabase.getPresets()
    await presetDatabase.syncPresets(localPresets)
    console.log('Presets synchronized successfully.')
  } catch (error) {
    console.error('Failed to synchronize presets:', error)
  }
}

export async function getIoportNames(): Promise<string[]> {
  if (!WebMidi.enabled) {
    await WebMidi.enable({ sysex: true })
  }

  return WebMidi.inputs.map((input) => input.name)
}

export async function backupPresets(portName: string): Promise<void> {
  await mkdir(`${BACKUP_FOLDER}/user`, { baseDir: BaseDirectory.Document, recursive: true })
  const input = WebMidi.getInputByName(portName) as Input
  const output = WebMidi.getOutputByName(portName) as Output

  for (let i = 0; i < 16; i++) {
    const command = REQUEST_COMMANDS[i]
    output.sendSysex([], command)

    const response = await new Promise<Uint8Array | null>((resolve) => {
      const listener = (e: any) => {
        input.removeListener('sysex', listener)
        resolve(e.data)
      }
      input.addListener('sysex', listener)

      setTimeout(() => {
        input.removeListener('sysex', listener)
        resolve(null)
      }, 1000)
    })

    if (response && response.length === 261) {
      await writeFile(
        `${BACKUP_FOLDER}/user/preset_${i + 1}.syx`,
        new Uint8Array([0xf0, ...response, 0xf7]),
        { baseDir: BaseDirectory.Document },
      )
      console.log(`Preset ${i + 1} backed up successfully.`)
    } else {
      console.log(
        `Error: Preset ${i + 1} data length is ${response ? response.length : 0} bytes, expected 261 bytes. Backup skipped.`,
      )
    }
  }
}

export function formatPresetData(
  data: Uint8Array,
  channel: number,
  targetSlot?: number,
): Uint8Array {
  if (data.slice(0, 7).toString() === '240,68,0,0,112,33,0') {
    data = new Uint8Array([...data.slice(0, 6), ...data.slice(7)])
  } else if (data.slice(0, 7).toString() === '240,68,0,0,112,32,96') {
    data = new Uint8Array([...data.slice(0, 6), ...data.slice(7)])
  } else if (data.slice(0, 6).toString() === '240,68,0,0,112,32') {
    data = new Uint8Array([...data.slice(0, 5), 0x00, ...data.slice(7)])
  }

  if (targetSlot !== undefined) {
    data = new Uint8Array([
      ...data.slice(0, 5),
      32,
      targetSlot + 32,
      ...data.slice(6),
    ])
  } else {
    data = new Uint8Array([...data.slice(0, 5), 32, 96, ...data.slice(6)])
  }

  // set the channel
  if (channel > 0 && channel < 17) {
    data[4] = 111 + channel
  } else {
    data[4] = 111
  }

  return data
}

export async function restorePresets(
  portName: string,
  targetSlot?: number,
  filename?: string,
  channel: number =1,
): Promise<void> {
  const output = WebMidi.getOutputByName(portName) as Output
  const filePaths = filename
    ? [filename]
    : Array.from(
        { length: 16 },
        (_, i) => `${BACKUP_FOLDER}/user/preset_${i + 1}.syx`,
      )

  for (const filePath of filePaths) {
    const fileExists = await exists(filePath, { baseDir: BaseDirectory.Document })
    if (fileExists) {
      const data = await readFile(filePath, { baseDir: BaseDirectory.Document })
      if (data.length !== 263) {
        console.log(
          `Error: Preset file ${filePath} data length is ${data.length} bytes, expected 263 bytes. Restore skipped.`,
        )
        continue
      }

      const target =
        targetSlot !== undefined ? targetSlot : filePaths.indexOf(filePath)
      const formattedData = formatPresetData(new Uint8Array(data), channel, target)
      output.sendSysex([], formattedData.slice(1, -1))
      console.log(
        `Preset from ${filePath} restored to slot ${target + 1} successfully.`,
      )
      await new Promise((resolve) => setTimeout(resolve, 100))
    } else {
      console.log(`Preset file ${filePath} not found.`)
    }
  }
}

export async function restoreToBuffer(
  portName: string,
  filename: string,
  channel: number = 1,
): Promise<void> {
  const output = WebMidi.getOutputByName(portName) as Output
  const fileExists = await exists(filename, { baseDir: BaseDirectory.Document })
  if (fileExists) {
    const data = await readFile(filename, { baseDir: BaseDirectory.Document })
    const formattedData = formatPresetData(new Uint8Array(data), channel)
    console.log('Formatted Data:', formattedData)
    output.sendSysex([], formattedData.slice(1, -1))
    console.log(`Preset from ${filename} restored to buffer successfully.`)
    await new Promise((resolve) => setTimeout(resolve, 100))
  } else {
    console.log(`Preset file ${filename} not found.`)
  }
}

export async function fetchTags(): Promise<string[]> {
  const presets = (await getPresets()) ?? []
  const tags = new Set<string>()
  presets.forEach((preset) => {
    preset.tags.forEach((tag) => tags.add(tag))
  })
  return Array.from(tags).sort()
}

export async function fetchPresetData(
  start: number,
  size: number,
  sorting: any,
  searchTerm: string,
  selectedTags: string[],
  filterMode: 'inclusive' | 'exclusive',
  favoritesOnly: boolean,
  randomOrder: boolean,
  seed: number
): Promise<{ presets: Preset[]; totalCount: number }> {
  const presets = (await getPresets()) ?? []

  // Filter presets based on search term
  let filteredPresets = presets

  if (favoritesOnly) {
    filteredPresets = filteredPresets.filter((preset) => preset.favorite)
  }
  if (searchTerm) {
    filteredPresets = filteredPresets.filter((preset) =>
      preset.name.toLowerCase().includes(searchTerm.toLowerCase()),
    )
  }

  // Filter presets based on selected tags
  if (selectedTags.length > 0) {
    filteredPresets = filteredPresets.filter((preset) => {
      if (filterMode === 'inclusive') {
        return selectedTags.every((tag) => preset.tags.includes(tag))
      } else {
        return selectedTags.some((tag) => preset.tags.includes(tag))
      }
    })
  }

  // Sort presets based on sorting state
  let sortedPresets = filteredPresets.sort((a, b) => {
    if (sorting.length === 0) return 0
    const { id, desc } = sorting[0]
    const order = desc ? -1 : 1
    if (a[id] < b[id]) return -1 * order
    if (a[id] > b[id]) return 1 * order
    return 0
  })

  // Shuffle presets if randomOrder is enabled
  if (randomOrder) {
    sortedPresets = shuffleArray(sortedPresets, seed)
  }

  // Paginate presets
  const paginatedPresets = sortedPresets.slice(start, start + size)
  return { presets: paginatedPresets ?? [], totalCount: filteredPresets.length }
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

export async function restorePresetToBuffer(
  preset: Preset,
  portName: string,
  channel: number = 1,
): Promise<void> {
  const output = WebMidi.getOutputByName(portName) as Output

  if (!output) {
    throw new Error('Output not ready')
  }

  const formattedData = formatPresetData(preset.sysexData, channel)
  console.log('Formatted Data:', formattedData)
  output.sendSysex([], formattedData.slice(1, -1))
  console.log(`Preset from ${preset.filename} restored to buffer successfully.`)
  await new Promise((resolve) => setTimeout(resolve, 100))
}

export async function getPresetList(): Promise<string[]> {
  const presetFiles: string[] = []
  for (let i = 0; i < 16; i++) {
    const filePath = `${BACKUP_FOLDER}/user/preset_${i + 1}.syx`
    const fileExists = await exists(filePath, {
      baseDir: BaseDirectory.Document,
    })
    if (fileExists) {
      presetFiles.push(filePath)
    }
  }
  return presetFiles
}

export async function loadPresetToBuffer(
  portName: string,
  presetNumber: number,
): Promise<void> {
  const filename = `${BACKUP_FOLDER}/user/preset_${presetNumber}.syx`
  await restoreToBuffer(portName, filename)
}
function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
export async function savePreset(
  portName: string,
  presetNumber: number,
  filename: string,
): Promise<Preset> {
  const output = WebMidi.getOutputByName(portName) as Output
  const input = WebMidi.getInputByName(portName) as Input

  console.log('Input:', input)

  const command = REQUEST_COMMANDS[presetNumber - 1]
  console.log('Request Commands:', REQUEST_COMMANDS)

  const response = await new Promise<Uint8Array | null>(async (resolve) => {
    input.addOneTimeListener('sysex', (e: any) => {
      console.log('Received sysex data inside promise:', e.data)

      resolve(e.data)
    })

    // Add a delay before sending the SysEx command
    await delay(500) // 500ms delay
    console.log('Sending SysEx command:', command.slice(1, -1))
    output.sendSysex([], command.slice(1, -1))
  })

  if (response && response.length === 263) {
    console.log('Response Buffer:', new Uint8Array([0xf0, ...response, 0xf7]))
    const preset = (
      await createPresetData(
        'preset_' + presetNumber + '.syx',
        new Uint8Array([...response]),
      )
    )[0]

    // fs.writeFileSync(filename, Buffer.from([0xf0, ...response, 0xf7]))
    console.log(`Preset ${presetNumber} saved to ${filename} successfully.`)
    preset.slot = presetNumber
    const newPreset = await addPreset(preset)
    return newPreset
  } else {
    console.log(`Failed to save preset ${presetNumber}.`)
    throw new Error('Failed to save preset.')
  }
}

export async function loadSettings(): Promise<Record<string, any>> {
  const fileExists = await exists(CONFIG_FILE, { baseDir: BaseDirectory.Document })
  if (fileExists) {
    const content = await readTextFile(CONFIG_FILE, { baseDir: BaseDirectory.Document })
    return JSON.parse(content)
  }
  return {}
}

export async function saveSettings(settings: Record<string, any>): Promise<void> {
  await writeTextFile(CONFIG_FILE, JSON.stringify(settings, null, 2), { baseDir: BaseDirectory.Document })
}

export function getBackupFolder(): string {
  return BACKUP_FOLDER
}

export async function getBackupFiles(): Promise<string[]> {
  const fileList: string[] = []
  const entries = await readDir(BACKUP_FOLDER, {
    baseDir: BaseDirectory.Document,
  })

  for (const entry of entries) {
    if (entry.isFile) {
      fileList.push(entry.name)
    } else if (entry.isDirectory) {
      const childEntries: DirEntry[] = await readDir(entry.name, {
        baseDir: BaseDirectory.Document,
      })
      for (const child of childEntries) {
        if (child.isFile) {
          fileList.push(`${entry.name}/${child.name}`)
        }
      }
    }
  }

  return fileList.sort(natsort())
}

export type Preset = {
  id: string
  name: string
  createdDate: string
  modifiedDate: string
  slot?: number
  filename: string
  sysexData: Uint8Array
  tags: string[]
  author?: string
  description?: string
  [key: string]: any
  favorite?: boolean
  rating?: 1 | 2 | 3 | 4 | 5
}

import { patches } from '../assets/cznames'

// Helper to parse preset names from cznames.json
async function parsePresetNames(): Promise<{
  [key: string]: { [key: string]: string }
}> {
  try {
    return patches
  } catch (error) {
    return {} // Return empty object if file not found or parsing fails
  }
}

// Function to determine tags based on preset name
function determineTags(presetName: string): string[] {
  const tags: string[] = []
  const lowerCaseName = presetName.toLowerCase()

  const tagMappings: { [key: string]: string[] } = {
    bass: ['bass', 'jaco', 'fretless', 'slap', 'p-bass', 'j-bass', 'bassline'],
    guitar: ['guitar', 'gtr', 'guit', 'koto'],
    piano: ['pian', 'ep', 'rhodes', 'clav', 'harpsi', 'key', 'kalim', 'pluck'],
    synth: ['synth'],
    effect: ['effect', 'fx'],
    drum: [
      'drum',
      'kick',
      'snare',
      'hat',
      'tom',
      'cymbal',
      'perc',
      'conga',
      'mallet',
    ],
    organ: ['organ'],
    bell: ['bell'],
    winds: [
      'flute',
      'flut',
      'whistle',
      'clarinet',
      'pan',
      'trump',
      'recorder',
      'horn',
      'sax',
      'oboe',
      'bassoon',
      'wind',
    ],
    voice: ['voice', 'choir', 'vox', 'vocal'],
    pad: ['pad'],
    strings: ['violin', 'viola', 'cello', 'strings', 'string', 'str'],
    brass: ['brass'],
    lead: ['lead'],
  }

  for (const [tag, keywords] of Object.entries(tagMappings)) {
    if (keywords.some((keyword) => lowerCaseName.includes(keyword))) {
      tags.push(tag)
    }
  }

  return tags
}
export async function createPresetData(
  filename: string,
  sysexData: Uint8Array,
): Promise<Preset[]> {
  const presets: Preset[] = []
  let startIndex = 0

  // Try to load preset names
  const presetNames = await parsePresetNames()
  const baseFilename = filename.replace(/\.syx$/i, '')

  while (startIndex < sysexData.length) {
    const endIndex = sysexData.indexOf(0xf7, startIndex)
    if (endIndex === -1) break

    const presetData = sysexData.slice(startIndex, endIndex + 1)
    if (presetData[0] === 0xf0 && presetData[presetData.length - 1] === 0xf7) {
      const presetIndex = presets.length
      const presetName =
        (presetNames[baseFilename] &&
          presetNames[baseFilename][String(presetIndex + 1)]) ||
        `${baseFilename}_${presetIndex + 1}`

      const tags = determineTags(presetName)

      presets.push({
        id: uuidv4(),
        name: presetName,
        createdDate: new Date().toISOString(),
        modifiedDate: new Date().toISOString(),
        filename,
        sysexData: presetData,
        tags,
        author: 'Temple of CZ',
        description: '',
      })
    }
    startIndex = endIndex + 1
  }

  return presets
}
export interface PresetDatabase {
  getPresets(): Promise<Preset[]>
  addPreset(preset: Preset): Promise<Preset>
  updatePreset(preset: Preset): Promise<void>
  deletePreset(id: string): Promise<void>
  syncPresets(localPresets: Preset[]): Promise<void>
  isAvailable(): Promise<boolean>
  import(json: string): Promise<void>
  export(): Promise<string>
}

export async function getPresets(): Promise<Preset[]> {
  return (await presetDatabase.getPresets()).sort((a, b) => {
    const aName = a.name.toLowerCase()
    const bName = b.name.toLowerCase()
    if (aName < bName) return -1
    if (aName > bName) return 1
    return 0
  })
}

export async function addPreset(preset: Preset): Promise<Preset> {
  return presetDatabase.addPreset(preset)
}

export async function updatePreset(preset: Preset): Promise<void> {
  return presetDatabase.updatePreset(preset)
}

export async function deletePreset(id: string): Promise<void> {
  return presetDatabase.deletePreset(id)
}

export async function exportPresets(): Promise<string> {
  return presetDatabase.export()
}

export async function importPresets(json: string): Promise<void> {
  return presetDatabase.import(json)
}
