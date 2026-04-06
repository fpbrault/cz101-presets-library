import { WebMidi, Output, Input } from 'webmidi'
import natsort from 'natsort'
//import { FakePresetDatabase } from './fakePresetDatabase'
import { IndexedDbPresetDatabase } from '@/lib/db/browserDatabase'
import { filterPresets } from '@/lib/presets/filterPresets'
import {
  PresetSyncCoordinator,
  RemotePresetSyncAdapter,
} from '@/lib/sync/presetSync'
import { isOnlineSyncEnabled } from '@/lib/sync/onlineSyncSettings'
import { loadFromLocalStorage, saveToLocalStorage } from '@/utils'
import {
  FACTORY_PRESET_AUTHOR,
  getFactoryPresetJson,
  isFactoryPresetIdentity,
} from '@/lib/presets/factoryPresets'

import { exists, mkdir, readFile, readTextFile, writeFile, writeTextFile, BaseDirectory, readDir, DirEntry } from '@tauri-apps/plugin-fs'
import { v4 as uuidv4 } from 'uuid'
import { SynthBackupEntry } from '@/lib/collections/synthBackupManager'
import { clearAllSynthBackups } from '@/lib/collections/synthBackupManager'

let presetDatabase: PresetDatabase
const presetSync = new PresetSyncCoordinator()
const DEFAULT_USER_PRESET_AUTHOR = 'User'
const FACTORY_PRESETS_ONBOARDING_KEY = 'cz101.factory-presets.onboarding.v1'

export function setPresetDatabase(database: PresetDatabase): void {
  presetDatabase = database
}

export function resetPresetDatabase(): void {
  presetDatabase = new IndexedDbPresetDatabase()
}

export function setPresetSyncAdapter(adapter: RemotePresetSyncAdapter): void {
  presetSync.setAdapter(adapter)
}

function isFactoryPreset(preset: Preset): boolean {
  return isFactoryPresetIdentity(preset)
}

function loadFactoryPresetLibrary(): Preset[] {
  const now = new Date().toISOString()
  return getFactoryPresetJson().map((preset) => ({
    id: String(preset.id ?? uuidv4()),
    name: String(preset.name ?? 'Factory Preset'),
    createdDate: String(preset.createdDate ?? now),
    modifiedDate: String(preset.modifiedDate ?? now),
    filename: String(preset.filename ?? 'factory_presets.json'),
    sysexData: Uint8Array.from((preset.sysexData ?? []) as number[]),
    tags: Array.isArray(preset.tags) ? preset.tags.map(String) : [],
    author: FACTORY_PRESET_AUTHOR,
    description: String(preset.description ?? ''),
    favorite: Boolean(preset.favorite ?? false),
    rating: preset.rating,
    isFactoryPreset: true,
  }))
}

export async function addFactoryPresetsToLibrary(): Promise<number> {
  const existingPresets = await presetDatabase.getPresets()
  const existingIds = new Set(existingPresets.map((preset) => preset.id))
  const missingFactoryPresets = loadFactoryPresetLibrary().filter(
    (preset) => !existingIds.has(preset.id),
  )

  if (missingFactoryPresets.length === 0) {
    return 0
  }

  await presetDatabase.syncPresets([...existingPresets, ...missingFactoryPresets])
  return missingFactoryPresets.length
}

export async function ensureFactoryPresetsOnFirstUse(): Promise<'needs-confirmation' | false> {
  if (typeof window === 'undefined') {
    return false
  }

  const onboardingState = loadFromLocalStorage(
    FACTORY_PRESETS_ONBOARDING_KEY,
    null,
  ) as string | null
  if (onboardingState) {
    return false
  }

  const existingPresets = await presetDatabase.getPresets()
  if (existingPresets.length > 0) {
    saveToLocalStorage(FACTORY_PRESETS_ONBOARDING_KEY, 'skipped')
    return false
  }

  return 'needs-confirmation'
}

export async function acceptFactoryPresetsOnboarding(): Promise<boolean> {
  saveToLocalStorage(FACTORY_PRESETS_ONBOARDING_KEY, 'accepted')
  const addedCount = await addFactoryPresetsToLibrary()
  return addedCount > 0
}

export function declineFactoryPresetsOnboarding(): void {
  saveToLocalStorage(FACTORY_PRESETS_ONBOARDING_KEY, 'declined')
}

export async function cloudBackupPresets(): Promise<boolean> {
  if (!isOnlineSyncEnabled()) {
    return false
  }
  const presets = await presetDatabase.getPresets()
  const userPresets = presets.filter((preset) => !isFactoryPreset(preset))
  return presetSync.backup(userPresets)
}

export async function clearCloudPresetBackup(): Promise<boolean> {
  if (!isOnlineSyncEnabled()) {
    return false
  }
  return presetSync.backup([])
}

export async function cloudRestorePresets(): Promise<number | null> {
  if (!isOnlineSyncEnabled()) {
    return null
  }
  const presets = await presetSync.restore()
  if (presets === null) {
    return null
  }

  const currentPresets = await presetDatabase.getPresets()
  const localFactoryPresets = currentPresets.filter((preset) =>
    isFactoryPreset(preset),
  )
  const restoredUserPresets = presets.filter((preset) => !isFactoryPreset(preset))

  await presetDatabase.syncPresets([...localFactoryPresets, ...restoredUserPresets])
  return restoredUserPresets.length
}

export async function resetLocalAppData(): Promise<void> {
  await presetDatabase.syncPresets([])
  clearAllSynthBackups()

  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(FACTORY_PRESETS_ONBOARDING_KEY)
  }
}

const REQUEST_COMMANDS = Array.from(
  { length: 16 },
  (_, i) => new Uint8Array([240, 68, 0, 0, 112, 16, i + 32, 112, 49, 247]),
)
const BACKUP_FOLDER = 'cz101_backup'
const CONFIG_FILE = 'config.json'
const SYSEX_TIMEOUT_MS = 1500

const matchesBytes = (arr: Uint8Array, bytes: number[]) =>
  bytes.every((b, i) => arr[i] === b)

function getSysexChannelByte(channel: number): number {
  if (channel > 0 && channel < 17) {
    return 111 + channel
  }
  return 111
}

function buildVoiceDumpRequest(channel: number, program: number): Uint8Array {
  return new Uint8Array([
    0xf0,
    0x44,
    0x00,
    0x00,
    getSysexChannelByte(channel),
    0x10,
    program,
    0x70,
    0x31,
    0xf7,
  ])
}

async function waitForSingleSysexResponse(
  input: Input,
  timeoutMs: number = SYSEX_TIMEOUT_MS,
): Promise<Uint8Array> {
  return new Promise<Uint8Array>((resolve, reject) => {
    const listener = (e: { data: Uint8Array }) => {
      clearTimeout(timeout)
      input.removeListener('sysex', listener)
      resolve(new Uint8Array(e.data))
    }

    input.addListener('sysex', listener)

    const timeout = setTimeout(() => {
      input.removeListener('sysex', listener)
      reject(new Error('Timed out waiting for SysEx response from synth'))
    }, timeoutMs)
  })
}

function ensureSysexFraming(data: Uint8Array): Uint8Array {
  if (data.length === 0) return data
  if (data[0] === 0xf0 && data[data.length - 1] === 0xf7) {
    return data
  }
  return new Uint8Array([0xf0, ...data, 0xf7])
}

function isNibblePayload(payload: Uint8Array): boolean {
  return payload.every((byte) => byte >= 0x00 && byte <= 0x0f)
}

function toCanonicalVoicePacketFromNibblePayload(payload: Uint8Array): Uint8Array {
  return new Uint8Array([
    0xf0,
    0x44,
    0x00,
    0x00,
    0x70,
    0x20,
    0x60,
    ...payload,
    0xf7,
  ])
}

function toCanonicalVoicePacketFromLogicalPayload(payload: Uint8Array): Uint8Array {
  const nibblePayload: number[] = []
  for (const value of payload) {
    nibblePayload.push(value & 0x0f, (value >> 4) & 0x0f)
  }
  return toCanonicalVoicePacketFromNibblePayload(Uint8Array.from(nibblePayload))
}

export function normalizeSysexForLibrary(data: Uint8Array): Uint8Array {
  const framed = ensureSysexFraming(data)

  // Canonical: payload starts at offset 7 and is 256 nibble bytes.
  if (framed.length >= 264) {
    const payload = framed.slice(7, 7 + 256)
    if (payload.length === 256 && isNibblePayload(payload)) {
      return toCanonicalVoicePacketFromNibblePayload(payload)
    }
  }

  // Tolerate command/program variations shifting payload start.
  for (let offset = 7; offset <= 16; offset++) {
    if (framed.length >= offset + 256 + 1) {
      const payload = framed.slice(offset, offset + 256)
      if (payload.length === 256 && isNibblePayload(payload)) {
        return toCanonicalVoicePacketFromNibblePayload(payload)
      }
    }
  }

  // Some dumps may carry 128 logical bytes; re-encode to canonical nibble stream.
  for (let offset = 7; offset <= 16; offset++) {
    if (framed.length >= offset + 128 + 1) {
      const payload = framed.slice(offset, offset + 128)
      if (payload.length === 128) {
        return toCanonicalVoicePacketFromLogicalPayload(payload)
      }
    }
  }

  // Preserve input if no known shape is detected.
  return framed
}

function normalizePresetPacketForStorage(data: Uint8Array): Uint8Array {
  if (data.length === 0) {
    return data
  }

  if (data[0] !== 0xf0 || data[data.length - 1] !== 0xf7) {
    return data
  }

  if (matchesBytes(data, [0xf0, 0x44, 0x00, 0x00, 0x70, 0x30])) {
    return new Uint8Array([
      0xf0,
      0x44,
      0x00,
      0x00,
      0x70,
      0x20,
      0x21,
      ...data.slice(6, -1),
      0xf7,
    ])
  }

  return data
}

function canonicalizePresetForLibrary(data: Uint8Array): Uint8Array {
  const normalized = normalizeSysexForLibrary(data)
  const formatted = formatPresetData(ensureSysexFraming(normalized), 1)
  const canonical = new Uint8Array(formatted)

  if (canonical.length > 7) {
    canonical[4] = 0x70
    canonical[5] = 0x20
    canonical[6] = 0x60
  }

  return canonical
}

function getProgramByteForSlot(bank: 'internal' | 'cartridge', slot: number): number {
  if (slot < 1 || slot > 16) {
    throw new Error('Slot must be between 1 and 16')
  }
  if (bank === 'internal') {
    return 0x20 + (slot - 1)
  }
  return slot - 1
}

function normalizePresetForComparison(data: Uint8Array): Uint8Array {
  return canonicalizePresetForLibrary(data)
}

function getPresetFingerprint(data: Uint8Array): string {
  return Array.from(normalizePresetForComparison(data)).join(',')
}

async function buildPresetMatchIndex(): Promise<Map<string, Preset>> {
  const presets = await getPresets()
  const index = new Map<string, Preset>()

  presets.forEach((preset) => {
    index.set(getPresetFingerprint(preset.sysexData), preset)
  })

  return index
}

async function requestVoiceDump(params: {
  portName: string
  channel: number
  program: number
  timeoutMs?: number
}): Promise<Uint8Array> {
  const output = WebMidi.getOutputByName(params.portName) as Output
  const input = WebMidi.getInputByName(params.portName) as Input

  if (!output || !input) {
    throw new Error('MIDI input/output port is not ready')
  }

  const responsePromise = waitForSingleSysexResponse(input, params.timeoutMs)
  const command = buildVoiceDumpRequest(params.channel, params.program)
  output.sendSysex([], command.slice(1, -1))

  const response = await responsePromise
  return ensureSysexFraming(response)
}

function buildReceiveRequest1Message(
  data: Uint8Array,
  channel: number,
  targetProgram?: number,
): Uint8Array {
  const formatted = formatPresetData(ensureSysexFraming(data), channel)
  const message = new Uint8Array(formatted)

  if (targetProgram !== undefined) {
    message[5] = 0x20
    message[6] = targetProgram
  }

  return message
}

function mapToSetlistEntry(
  slot: number,
  programByte: number,
  sysexData: Uint8Array,
  presetMatchIndex: Map<string, Preset>,
): SynthBackupEntry {
  const matchedPreset = presetMatchIndex.get(getPresetFingerprint(sysexData))

  return {
    slot,
    programByte,
    sysexData,
    isExactLibraryMatch: Boolean(matchedPreset),
    matchedPresetId: matchedPreset?.id,
    matchedPresetName: matchedPreset?.name,
    matchedPresetAuthor: matchedPreset?.author,
  }
}

export async function getMatchingPresetBySysex(
  sysexData: Uint8Array,
): Promise<Preset | undefined> {
  const index = await buildPresetMatchIndex()
  return index.get(getPresetFingerprint(sysexData))
}

export async function retrieveCurrentPresetFromSynth(
  portName: string,
  channel: number,
): Promise<{ sysexData: Uint8Array; matchingPreset?: Preset }> {
  const sysexData = await requestVoiceDump({
    portName,
    channel,
    program: 0x60,
  })
  const matchingPreset = await getMatchingPresetBySysex(sysexData)
  return { sysexData, matchingPreset }
}

export async function retrievePresetSlotFromSynth(
  portName: string,
  channel: number,
  bank: 'internal' | 'cartridge',
  slot: number,
): Promise<{ sysexData: Uint8Array; programByte: number; matchingPreset?: Preset }> {
  const programByte = getProgramByteForSlot(bank, slot)
  const sysexData = await requestVoiceDump({
    portName,
    channel,
    program: programByte,
  })
  const matchingPreset = await getMatchingPresetBySysex(sysexData)
  return { sysexData, programByte, matchingPreset }
}

export async function retrieveInternalBackupFromSynth(
  portName: string,
  channel: number,
  onProgress?: (completed: number, total: number) => void,
): Promise<SynthBackupEntry[]> {
  const presetMatchIndex = await buildPresetMatchIndex()
  const results: SynthBackupEntry[] = []

  for (let i = 0; i < 16; i++) {
    const slot = i + 1
    const programByte = 0x20 + i
    const sysexData = await requestVoiceDump({
      portName,
      channel,
      program: programByte,
    })

    results.push(mapToSetlistEntry(slot, programByte, sysexData, presetMatchIndex))
    onProgress?.(slot, 16)
    await delay(60)
  }

  return results
}

export async function writePresetToSynthSlot(
  preset: Preset,
  portName: string,
  channel: number,
  bank: 'internal' | 'cartridge',
  slot: number,
): Promise<void> {
  await writeSysexDataToSynthSlot(preset.sysexData, portName, channel, bank, slot)
}

export async function writeSysexDataToSynthSlot(
  sysexData: Uint8Array,
  portName: string,
  channel: number,
  bank: 'internal' | 'cartridge',
  slot: number,
): Promise<void> {
  const output = WebMidi.getOutputByName(portName) as Output
  if (!output) {
    throw new Error('Output not ready')
  }

  const programByte = getProgramByteForSlot(bank, slot)
  const message = buildReceiveRequest1Message(sysexData, channel, programByte)
  output.sendSysex([], message.slice(1, -1))
  await delay(100)
}

export async function writeSysexDataToTemporaryBuffer(
  sysexData: Uint8Array,
  portName: string,
  channel: number,
): Promise<void> {
  const output = WebMidi.getOutputByName(portName) as Output
  if (!output) {
    throw new Error('Output not ready')
  }

  const message = buildReceiveRequest1Message(sysexData, channel, 0x60)
  output.sendSysex([], message.slice(1, -1))
  await delay(100)
}

if (typeof window !== 'undefined' && (window as any).__TAURI__) {
  console.log('Running in Tauri')
  // Running in Tauri
  resetPresetDatabase()
} else {
  console.log('Running in a browser')
  // Running in a browser
  resetPresetDatabase()
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
  if (
    data.length >= 7 &&
    matchesBytes(data, [240, 68, 0, 0, data[4], 33])
  ) {
    data = new Uint8Array([...data.slice(0, 6), ...data.slice(7)])
  } else if (matchesBytes(data, [240, 68, 0, 0, 112, 32, 96])) {
    data = new Uint8Array([...data.slice(0, 6), ...data.slice(7)])
  } else if (matchesBytes(data, [240, 68, 0, 0, 112, 32])) {
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

export async function fetchPresetData(
  start: number,
  size: number,
  sorting: any,
  searchTerm: string,
  selectedTags: string[],
  filterMode: 'inclusive' | 'exclusive',
  favoritesOnly: boolean,
  randomOrder: boolean,
  seed: number,
  duplicatesOnly: boolean = false,
  userPresetsOnly: boolean = false,
  playlistPresetIds: string[] | null = null,
): Promise<{ presets: Preset[]; totalCount: number }> {
  const presets = (await getPresets()) ?? []

  const { presets: filteredAndSortedPresets, totalCount } = filterPresets(
    presets,
    {
      sorting,
      searchTerm,
      selectedTags,
      filterMode,
      userPresetsOnly,
      favoritesOnly,
      duplicatesOnly,
      randomOrder,
      seed,
      playlistPresetIds,
    },
  )

  const paginatedPresets =
    size < 0
      ? filteredAndSortedPresets.slice(start)
      : filteredAndSortedPresets.slice(start, start + size)

  return { presets: paginatedPresets ?? [], totalCount }
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
  _filename: string,
  channel: number = 1,
): Promise<Preset> {
  if (presetNumber < 1 || presetNumber > 16) {
    throw new Error('Preset number must be between 1 and 16')
  }

  const { sysexData } = await retrievePresetSlotFromSynth(
    portName,
    channel,
    'internal',
    presetNumber,
  )

  const preset = (
    await createPresetData(
      'preset_' + presetNumber + '.syx',
      sysexData,
    )
  )[0]

  if (!preset) {
    throw new Error('Failed to parse preset from synth response.')
  }

  preset.slot = presetNumber
  const newPreset = await addPreset(preset)
  return newPreset
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
  isFactoryPreset?: boolean
  [key: string]: any
  favorite?: boolean
  rating?: 1 | 2 | 3 | 4 | 5
}

export function createPresetFromSysex(params: {
  filename: string
  name: string
  sysexData: Uint8Array
  author?: string
  description?: string
  tags?: string[]
}): Preset {
  const timestamp = new Date().toISOString()
  const trimmedName = params.name.trim()
  const normalizedSysexData = normalizePresetPacketForStorage(params.sysexData)

  return {
    id: uuidv4(),
    name: trimmedName,
    createdDate: timestamp,
    modifiedDate: timestamp,
    filename: params.filename,
    sysexData: normalizedSysexData,
    tags: params.tags ?? determineTags(trimmedName),
    author: params.author ?? DEFAULT_USER_PRESET_AUTHOR,
    description: params.description ?? '',
    isFactoryPreset: false,
  }
}

import { patches } from '@/assets/cznames'

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
  const normalizedInput = normalizePresetPacketForStorage(sysexData)
  let startIndex = 0

  // Try to load preset names
  const presetNames = await parsePresetNames()
  const baseFilename = filename.replace(/\.syx$/i, '')

  while (startIndex < normalizedInput.length) {
    const endIndex = normalizedInput.indexOf(0xf7, startIndex)
    if (endIndex === -1) break

    const presetData = normalizedInput.slice(startIndex, endIndex + 1)
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
        author: DEFAULT_USER_PRESET_AUTHOR,
        description: '',
        isFactoryPreset: false,
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
  const nextPreset: Preset = {
    ...preset,
    modifiedDate: new Date().toISOString(),
  }
  const savedPreset = await presetDatabase.addPreset(nextPreset)
  return savedPreset
}

export async function updatePreset(preset: Preset): Promise<void> {
  const nextPreset: Preset = {
    ...preset,
    modifiedDate: new Date().toISOString(),
  }
  await presetDatabase.updatePreset(nextPreset)
}

export async function deletePreset(id: string): Promise<void> {
  await presetDatabase.deletePreset(id)
}

function normalizeTagValue(tag: string): string {
  return tag.trim().toLowerCase()
}

export async function renameTagGlobally(
  sourceTag: string,
  targetTag: string,
): Promise<number> {
  const source = normalizeTagValue(sourceTag)
  const target = normalizeTagValue(targetTag)

  if (!source || !target) {
    return 0
  }

  const presets = await getPresets()
  let updatedCount = 0

  for (const preset of presets) {
    const nextTags = Array.from(
      new Set(
        preset.tags.map((tag) => {
          const normalized = normalizeTagValue(tag)
          return normalized === source ? target : normalized
        }),
      ),
    )

    if (nextTags.join('|') !== preset.tags.map(normalizeTagValue).join('|')) {
      await updatePreset({
        ...preset,
        tags: nextTags,
      })
      updatedCount += 1
    }
  }

  return updatedCount
}

export async function deleteTagGlobally(tagToDelete: string): Promise<number> {
  const target = normalizeTagValue(tagToDelete)
  if (!target) {
    return 0
  }

  const presets = await getPresets()
  let updatedCount = 0

  for (const preset of presets) {
    const nextTags = preset.tags
      .map(normalizeTagValue)
      .filter((tag) => tag !== target)

    if (nextTags.join('|') !== preset.tags.map(normalizeTagValue).join('|')) {
      await updatePreset({
        ...preset,
        tags: Array.from(new Set(nextTags)),
      })
      updatedCount += 1
    }
  }

  return updatedCount
}

export async function exportPresets(): Promise<string> {
  return presetDatabase.export()
}

export async function importPresets(json: string): Promise<void> {
  await presetDatabase.import(json)
}
