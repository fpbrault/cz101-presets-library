import fs from 'fs'
import { WebMidi, Output, Input } from 'webmidi'
import natsort from 'natsort'
//import { FakePresetDatabase } from './fakePresetDatabase'
import { IndexedDbPresetDatabase } from './browserDatabase'

import { exists, BaseDirectory, readDir, DirEntry } from '@tauri-apps/plugin-fs'
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
  fs.mkdirSync(BACKUP_FOLDER, { recursive: true })
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
      fs.writeFileSync(
        `${BACKUP_FOLDER}/user/preset_${i + 1}.syx`,
        Buffer.from([0xf0, ...response, 0xf7]),
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
  targetSlot?: number,
): Uint8Array {
  if (data.slice(0, 7).toString() === '240,68,0,0,112,33,0') {
    data = new Uint8Array([...data.slice(0, 6), ...data.slice(7)])
  }
  if (data.slice(0, 7).toString() === '240,68,0,0,112,32,96') {
    data = new Uint8Array([...data.slice(0, 6), ...data.slice(7)])
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

  return data
}

export async function restorePresets(
  portName: string,
  targetSlot?: number,
  filename?: string,
): Promise<void> {
  const output = WebMidi.getOutputByName(portName) as Output
  const filePaths = filename
    ? [filename]
    : Array.from(
        { length: 16 },
        (_, i) => `${BACKUP_FOLDER}/user/preset_${i + 1}.syx`,
      )

  for (const filePath of filePaths) {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath)
      if (data.length !== 263) {
        console.log(
          `Error: Preset file ${filePath} data length is ${data.length} bytes, expected 263 bytes. Restore skipped.`,
        )
        continue
      }

      const target =
        targetSlot !== undefined ? targetSlot : filePaths.indexOf(filePath)
      const formattedData = formatPresetData(new Uint8Array(data), target)
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
): Promise<void> {
  const output = WebMidi.getOutputByName(portName) as Output
  if (fs.existsSync(filename)) {
    const data = fs.readFileSync(filename)
    const formattedData = formatPresetData(new Uint8Array(data))
    output.sendSysex([], formattedData.slice(1, -1))
    console.log(`Preset from ${filename} restored to buffer successfully.`)
    await new Promise((resolve) => setTimeout(resolve, 100))
  } else {
    console.log(`Preset file ${filename} not found.`)
  }
}

export async function restorePresetToBuffer(
  preset: Preset,
  portName: string,
): Promise<void> {
  const output = WebMidi.getOutputByName(portName) as Output

  const formattedData = formatPresetData(preset.sysexData)
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
): Promise<void> {
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
    const preset = await createPresetData(
      'preset_' + presetNumber + '.syx',
      new Uint8Array([...response]),
    )
    addPreset(preset)
    // fs.writeFileSync(filename, Buffer.from([0xf0, ...response, 0xf7]))
    console.log(`Preset ${presetNumber} saved to ${filename} successfully.`)
  } else {
    console.log(`Failed to save preset ${presetNumber}.`)
  }
}

export function loadSettings(): Record<string, any> {
  if (fs.existsSync(CONFIG_FILE)) {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'))
  }
  return {}
}

export function saveSettings(settings: Record<string, any>): void {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(settings, null, 2))
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

export async function createPresetData(
  filename: string,
  sysexData: Uint8Array,
): Promise<Preset> {
  console.log(filename)
  return {
    id: uuidv4(),
    name: filename.replace(/\.[^/.]+$/, ''),
    createdDate: new Date().toISOString(),
    modifiedDate: new Date().toISOString(),
    filename,
    sysexData,
    tags: [],
    author: '',
    description: '',
  }
}

export interface PresetDatabase {
  getPresets(): Promise<Preset[]>
  addPreset(preset: Preset): Promise<void>
  updatePreset(preset: Preset): Promise<void>
  deletePreset(id: string): Promise<void>
  syncPresets(localPresets: Preset[]): Promise<void>
  isAvailable(): Promise<boolean>
  import(json: string): Promise<void>
  export(): Promise<string>
}

export async function getPresets(): Promise<Preset[]> {
  return presetDatabase.getPresets()
}

export async function addPreset(preset: Preset): Promise<void> {
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
