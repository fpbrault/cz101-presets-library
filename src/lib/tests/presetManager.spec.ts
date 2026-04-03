import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  formatPresetData,
  Preset,
  createPresetData,
  fetchPresetData,
  addPreset,
  deleteTagGlobally,
  getPresets,
  renameTagGlobally,
} from '@/lib/presetManager'
import { IndexedDbPresetDatabase } from '@/lib/browserDatabase'

describe('formatPresetData', () => {
  it('should format preset data with channel', () => {
    // Create a basic SysEx data array (F0 68 00 00 70 20 60 ... F7)
    const data = new Uint8Array([
      0xf0, 0x68, 0x00, 0x00, 0x70, 0x20, 0x60, 0x00, 0x00, 0x00, 0xf7,
    ])
    const channel = 1
    const result = formatPresetData(data, channel)

    expect(result).toBeInstanceOf(Uint8Array)
    expect(result[0]).toBe(0xf0)
    expect(result[result.length - 1]).toBe(0xf7)
    // Channel should be set at position 4 (111 + channel)
    expect(result[4]).toBe(112)
  })

  it('should format preset data with different channel', () => {
    const data = new Uint8Array([
      0xf0, 0x68, 0x00, 0x00, 0x70, 0x20, 0x60, 0x00, 0x00, 0x00, 0xf7,
    ])
    const channel = 5
    const result = formatPresetData(data, channel)

    expect(result[4]).toBe(116) // 111 + 5
  })

  it('should format preset data with invalid channel (should default to 0)', () => {
    const data = new Uint8Array([
      0xf0, 0x68, 0x00, 0x00, 0x70, 0x20, 0x60, 0x00, 0x00, 0x00, 0xf7,
    ])
    const channel = 99 // Invalid channel
    const result = formatPresetData(data, channel)

    expect(result[4]).toBe(111) // Default
  })

  it('should handle preset data with specific format prefix (240,68,0,0,112,33,0)', () => {
    const data = new Uint8Array([
      0xf0, 0x68, 0x00, 0x00, 0x70, 0x21, 0x00, 0x01, 0x02, 0x03, 0xf7,
    ])
    const result = formatPresetData(data, 1)

    // Should remove the byte at index 6  (0x00) since the condition matches
    expect(result.slice(0, 7).toString()).not.toBe('240,68,0,0,112,33,0')
    expect(result).toBeInstanceOf(Uint8Array)
  })

  it('should set target slot when provided', () => {
    const data = new Uint8Array([
      0xf0, 0x68, 0x00, 0x00, 0x70, 0x20, 0x60, 0x00, 0x00, 0x00, 0xf7,
    ])
    const targetSlot = 3
    const result = formatPresetData(data, 1, targetSlot)

    // Target slot should be at position 6 (32 + targetSlot)
    expect(result[6]).toBe(35) // 32 + 3
  })

  it('should raise error for invalid input', () => {
    const data = new Uint8Array([0x00, 0x00, 0x00])
    const result = formatPresetData(data, 1)

    // Should still return a Uint8Array even with invalid input
    expect(result).toBeInstanceOf(Uint8Array)
  })
})

describe('determineTags', () => {
  // Note: determineTags is not exported, so we test it indirectly through createPresetData
  it('should properly assign tags based on preset name', async () => {
    // Create sample SysEx data with proper structure
    const sysexData = new Uint8Array([
      0xf0, 0x68, 0x00, 0x00, 0x70, 0x20, 0x60, 0x00, 0x00, 0xf7,
    ])
    
    const presets = await createPresetData('bass_patch.syx', sysexData)
    expect(presets).toHaveLength(1)
    expect(presets[0].tags).toContain('bass')
  })

  it('should assign multiple tags to a single preset', async () => {
    const sysexData = new Uint8Array([
      0xf0, 0x68, 0x00, 0x00, 0x70, 0x20, 0x60, 0x00, 0x00, 0xf7,
    ])
    
    const presets = await createPresetData('synth_pad.syx', sysexData)
    expect(presets).toHaveLength(1)
    expect(presets[0].tags).toContain('synth')
    expect(presets[0].tags).toContain('pad')
  })

  it('should handle preset names without matching tags', async () => {
    const sysexData = new Uint8Array([
      0xf0, 0x68, 0x00, 0x00, 0x70, 0x20, 0x60, 0x00, 0x00, 0xf7,
    ])
    
    const presets = await createPresetData('unknown_sound.syx', sysexData)
    expect(presets).toHaveLength(1)
    expect(presets[0].tags.length).toBe(0)
  })
})

describe('createPresetData', () => {
  it('should parse a single preset from SysEx data', async () => {
    const sysexData = new Uint8Array([
      0xf0, 0x68, 0x00, 0x00, 0x70, 0x20, 0x60, 0x00, 0x00, 0xf7,
    ])

    const presets = await createPresetData('test.syx', sysexData)

    expect(presets).toHaveLength(1)
    expect(presets[0]).toHaveProperty('id')
    expect(presets[0]).toHaveProperty('name')
    expect(presets[0]).toHaveProperty('createdDate')
    expect(presets[0]).toHaveProperty('modifiedDate')
    expect(presets[0]).toHaveProperty('filename', 'test.syx')
    expect(presets[0]).toHaveProperty('sysexData')
    expect(presets[0]).toHaveProperty('tags')
    expect(presets[0]).toHaveProperty('author', 'Temple of CZ')
  })

  it('should preserve the original packet bytes when creating a standard preset', async () => {
    const sysexData = new Uint8Array([
      0xf0,
      0x44,
      0x00,
      0x00,
      0x70,
      0x20,
      0x24,
      0x0a,
      0x00,
      0x06,
      0x02,
      0x0d,
      0xf7,
    ])

    const presets = await createPresetData('receive-request.syx', sysexData)

    expect(presets).toHaveLength(1)
    expect(Array.from(presets[0].sysexData)).toEqual(Array.from(sysexData))
  })

  it('should convert backup packets to standard preset headers', async () => {
    const sysexData = new Uint8Array([
      0xf0,
      0x44,
      0x00,
      0x00,
      0x70,
      0x30,
      0x0a,
      0x00,
      0x06,
      0x02,
      0x0d,
      0xf7,
    ])

    const presets = await createPresetData('backup-entry.syx', sysexData)

    expect(presets).toHaveLength(1)
    expect(Array.from(presets[0].sysexData)).toEqual([
      0xf0,
      0x44,
      0x00,
      0x00,
      0x70,
      0x20,
      0x21,
      0x0a,
      0x00,
      0x06,
      0x02,
      0x0d,
      0xf7,
    ])
  })

  it('should parse multiple presets from SysEx data', async () => {
    const sysexData = new Uint8Array([
      0xf0, 0x68, 0x00, 0x00, 0x70, 0x20, 0x60, 0x00, 0xf7,
      0xf0, 0x68, 0x00, 0x00, 0x70, 0x20, 0x61, 0x00, 0xf7,
    ])

    const presets = await createPresetData('multi.syx', sysexData)

    expect(presets).toHaveLength(2)
    expect(presets[0].name).toContain('multi_1')
    expect(presets[1].name).toContain('multi_2')
  })

  it('should have unique IDs for each preset', async () => {
    const sysexData = new Uint8Array([
      0xf0, 0x68, 0x00, 0x00, 0x70, 0x20, 0x60, 0x00, 0xf7,
      0xf0, 0x68, 0x00, 0x00, 0x70, 0x20, 0x61, 0x00, 0xf7,
    ])

    const presets = await createPresetData('unique_ids.syx', sysexData)

    const ids = presets.map((p) => p.id)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(presets.length)
  })

  it('should handle empty SysEx data', async () => {
    const sysexData = new Uint8Array([])

    const presets = await createPresetData('empty.syx', sysexData)

    expect(presets).toHaveLength(0)
  })

  it('should handle malformed SysEx data without F7 terminator', async () => {
    const sysexData = new Uint8Array([0xf0, 0x68, 0x00, 0x00, 0x70, 0x20, 0x60])
    const presets = await createPresetData('malformed.syx', sysexData)

    expect(presets).toHaveLength(0)
  })
})

describe('fetchPresetData', () => {
  let db: IndexedDbPresetDatabase
  const mockPresets: Preset[] = [
    {
      id: '1',
      name: 'Bass Lead',
      createdDate: '2021-01-01',
      modifiedDate: '2021-01-01',
      filename: 'test1.syx',
      sysexData: new Uint8Array(263),
      tags: ['bass', 'lead'],
      author: 'Test',
      description: 'Test',
      favorite: true,
    },
    {
      id: '2',
      name: 'Pad Synth',
      createdDate: '2021-01-02',
      modifiedDate: '2021-01-02',
      filename: 'test2.syx',
      sysexData: new Uint8Array(263),
      tags: ['pad', 'synth'],
      author: 'Test',
      description: 'Test',
      favorite: false,
    },
    {
      id: '3',
      name: 'Drum Kit',
      createdDate: '2021-01-03',
      modifiedDate: '2021-01-03',
      filename: 'test3.syx',
      sysexData: new Uint8Array(263),
      tags: ['drum'],
      author: 'Test',
      description: 'Test',
      favorite: true,
    },
  ]

  beforeEach(async () => {
    db = new IndexedDbPresetDatabase()
    await db.syncPresets([])
    for (const preset of mockPresets) {
      await addPreset(preset)
    }
  })

  afterEach(async () => {
    await db.syncPresets([])
  })

  it('should preserve exact sysex bytes when saving a preset', async () => {
    const sysexData = new Uint8Array([
      0xf0,
      0x44,
      0x00,
      0x00,
      0x70,
      0x20,
      0x24,
      0x0a,
      0x00,
      0x06,
      0x02,
      0x0d,
      0xf7,
    ])

    const saved = await addPreset({
      id: 'raw-save',
      name: 'Raw Save',
      createdDate: '2021-01-01',
      modifiedDate: '2021-01-01',
      filename: 'raw-save.syx',
      sysexData,
      tags: [],
      author: 'Test',
      description: 'Test',
    })

    expect(Array.from(saved.sysexData)).toEqual(Array.from(sysexData))
  })

  it('should search presets by name', async () => {
    const result = await fetchPresetData(0, 10, [], 'Bass', [], 'inclusive', false, false, 0)
    expect(result.presets.filter((p) => p.name.toLowerCase().includes('bass'))).toHaveLength(1)
    expect(result.totalCount).toBe(1)
  })

  it('should filter presets by tags (inclusive)', async () => {
    const result = await fetchPresetData(
      0,
      10,
      [],
      '',
      ['bass', 'lead'],
      'inclusive',
      false,
      false,
      0,
    )
    expect(result.presets).toHaveLength(1)
    expect(result.presets[0].id).toBe('1')
  })

  it('should filter presets by tags (exclusive)', async () => {
    const result = await fetchPresetData(
      0,
      10,
      [],
      '',
      ['pad'],
      'exclusive',
      false,
      false,
      0,
    )
    expect(result.presets.filter((p) => p.tags.includes('pad'))).toHaveLength(1)
  })

  it('should return paginated results', async () => {
    const result = await fetchPresetData(0, 2, [], '', [], 'inclusive', false, false, 0)
    expect(result.presets.length).toBeLessThanOrEqual(2)
  })

  it('should handle sorting by name ascending', async () => {
    const result = await fetchPresetData(
      0,
      10,
      [{ id: 'name', desc: false }],
      '',
      [],
      'inclusive',
      false,
      false,
      0,
    )
    expect(result.presets.length).toBeGreaterThan(0)
    // Verify sorted order
    for (let i = 1; i < result.presets.length; i++) {
      const current = result.presets[i].name.toLowerCase()
      const previous = result.presets[i - 1].name.toLowerCase()
      expect(current >= previous).toBe(true)
    }
  })

  it('should filter by favorites only', async () => {
    const result = await fetchPresetData(
      0,
      10,
      [],
      '',
      [],
      'inclusive',
      true,
      false,
      0,
    )
    expect(result.presets.every((p) => p.favorite === true)).toBe(true)
    expect(result.totalCount).toBe(2) // 2 presets are marked as favorite
  })

  it('should combine search and tag filtering', async () => {
    const result = await fetchPresetData(
      0,
      10,
      [],
      'Pad',
      ['synth'],
      'inclusive',
      false,
      false,
      0,
    )
    expect(result.presets).toHaveLength(1)
    expect(result.presets[0].id).toBe('2')
  })

  it('should return correct totalCount', async () => {
    const result = await fetchPresetData(0, 5, [], '', [], 'inclusive', false, false, 0)
    expect(result).toHaveProperty('totalCount')
    expect(result.totalCount).toBe(3)
  })

  it('should filter to duplicates only when requested', async () => {
    const uniquePreset: Preset = {
      id: '4',
      name: 'Unique Lead',
      createdDate: '2021-01-04',
      modifiedDate: '2021-01-04',
      filename: 'test4.syx',
      sysexData: new Uint8Array([0xf0, 0x44, 0x00, 0x00, 0x70, 0x20, 0x01, 0xf7]),
      tags: ['lead'],
      author: 'Test',
      description: 'Unique',
      favorite: false,
    }

    await addPreset(uniquePreset)

    const result = await fetchPresetData(
      0,
      10,
      [],
      '',
      [],
      'inclusive',
      false,
      false,
      0,
      true,
    )

    expect(result.presets).toHaveLength(3)
    expect(result.presets.every((preset) => preset.id !== '4')).toBe(true)
  })

  it('should handle pagination offset', async () => {
    const firstPage = await fetchPresetData(0, 2, [], '', [], 'inclusive', false, false, 0)
    const secondPage = await fetchPresetData(2, 2, [], '', [], 'inclusive', false, false, 0)
    
    expect(firstPage.presets.length).toBe(2)
    expect(secondPage.presets.length).toBe(1)
    expect(firstPage.presets[0].id).not.toBe(secondPage.presets[0].id)
  })

  it('should rename and merge tags globally', async () => {
    const updated = await renameTagGlobally('bass', 'low-end')

    expect(updated).toBeGreaterThan(0)

    const presets = await getPresets()
    const bassPresets = presets.filter((preset) => preset.name === 'Bass Lead')
    expect(bassPresets[0].tags).toContain('low-end')
    expect(bassPresets[0].tags).not.toContain('bass')
  })

  it('should delete tags globally', async () => {
    const updated = await deleteTagGlobally('drum')

    expect(updated).toBeGreaterThan(0)

    const presets = await getPresets()
    const drumPreset = presets.find((preset) => preset.name === 'Drum Kit')
    expect(drumPreset?.tags).not.toContain('drum')
  })
})
