// src/lib/fakePresetDatabase.ts
import { Preset, PresetDatabase } from '@/lib/presetManager'
import { v4 as uuidv4 } from 'uuid'

let fakePresets: Preset[] = [
  {
    id: uuidv4(),
    name: 'Preset 1',
    createdDate: '2021-09-01',
    modifiedDate: '2021-09-01',
    filename: 'preset_1.syx',
    sysexData: new Uint8Array(263),
    author: 'Author 1',
    description: 'Description 1',
    tags: ['Bass'],
  },
  {
    id: uuidv4(),
    name: 'Preset 2',
    createdDate: '2021-09-02',
    modifiedDate: '2021-09-02',
    filename: 'preset_2.syx',
    sysexData: new Uint8Array(263),
    author: 'Author 1',
    description: 'Description 1',
    tags: ['Pad', 'Lofi', 'Slow'],
  },
  {
    id: uuidv4(),
    name: 'Preset 3',
    createdDate: '2021-09-03',
    modifiedDate: '2021-09-03',
    filename: 'preset_3.syx',
    sysexData: new Uint8Array(263),
    author: 'Author 1',
    description: 'Description 1',
    tags: ['Brass'],
  },
]

export class FakePresetDatabase implements PresetDatabase {
  syncPresets(_localPresets: Preset[]): Promise<void> {
    throw new Error('Method not implemented.')
  }
  isAvailable(): Promise<boolean> {
    throw new Error('Method not implemented.')
  }
  import(_json: string): Promise<void> {
    throw new Error('Method not implemented.')
  }
  export(): Promise<string> {
    throw new Error('Method not implemented.')
  }
  async getPresets(): Promise<Preset[]> {
    return fakePresets
  }

  async addPreset(preset: Preset): Promise<Preset> {
    fakePresets.push(preset)
    return preset
  }

  async updatePreset(preset: Preset): Promise<void> {
    fakePresets = fakePresets.map((p) => (p.id === preset.id ? preset : p))
  }

  async deletePreset(id: string): Promise<void> {
    fakePresets = fakePresets.filter((preset) => preset.id !== id)
  }
}
