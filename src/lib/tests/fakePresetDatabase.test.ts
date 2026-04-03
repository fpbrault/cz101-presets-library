import { describe, it, expect, beforeEach } from 'vitest'
import { FakePresetDatabase } from '@/lib/fakePresetDatabase'
import { Preset } from '@/lib/presetManager'
import { v4 as uuidv4 } from 'uuid'

describe('FakePresetDatabase', () => {
  let db: FakePresetDatabase

  beforeEach(() => {
    db = new FakePresetDatabase()
  })

  describe('getPresets', () => {
    it('should return an array of presets', async () => {
      const presets = await db.getPresets()
      expect(Array.isArray(presets)).toBe(true)
      expect(presets.length).toBeGreaterThan(0)
    })

    it('should return presets with required properties', async () => {
      const presets = await db.getPresets()
      presets.forEach((preset) => {
        expect(preset).toHaveProperty('id')
        expect(preset).toHaveProperty('name')
        expect(preset).toHaveProperty('createdDate')
        expect(preset).toHaveProperty('modifiedDate')
        expect(preset).toHaveProperty('filename')
        expect(preset).toHaveProperty('sysexData')
        expect(preset).toHaveProperty('tags')
      })
    })

    it('should return presets with correct structure', async () => {
      const presets = await db.getPresets()
      expect(presets[0].sysexData).toBeInstanceOf(Uint8Array)
      expect(Array.isArray(presets[0].tags)).toBe(true)
    })
  })

  describe('addPreset', () => {
    it('should add a preset to the database', async () => {
      const initialPresets = await db.getPresets()
      const initialCount = initialPresets.length

      const newPreset: Preset = {
        id: uuidv4(),
        name: 'New Test Preset',
        createdDate: new Date().toISOString(),
        modifiedDate: new Date().toISOString(),
        filename: 'new_test.syx',
        sysexData: new Uint8Array(263),
        tags: ['test'],
        author: 'Test Author',
        description: 'Test Description',
      }

      await db.addPreset(newPreset)
      const updatedPresets = await db.getPresets()

      expect(updatedPresets.length).toBe(initialCount + 1)
      expect(updatedPresets).toContainEqual(newPreset)
    })

    it('should maintain preset properties after adding', async () => {
      const newPreset: Preset = {
        id: uuidv4(),
        name: 'Property Test',
        createdDate: '2024-01-01T00:00:00Z',
        modifiedDate: '2024-01-01T00:00:00Z',
        filename: 'property_test.syx',
        sysexData: new Uint8Array([1, 2, 3]),
        tags: ['property', 'test'],
        author: 'Test',
        description: 'Property Test Description',
      }

      await db.addPreset(newPreset)
      const presets = await db.getPresets()
      const addedPreset = presets.find((p) => p.id === newPreset.id)

      expect(addedPreset).toBeDefined()
      expect(addedPreset?.name).toBe('Property Test')
      expect(addedPreset?.sysexData).toEqual(new Uint8Array([1, 2, 3]))
    })
  })

  describe('updatePreset', () => {
    it('should update a preset in the database', async () => {
      let presets = await db.getPresets()
      const presetToUpdate = presets[0]

      const updatedPreset: Preset = {
        ...presetToUpdate,
        name: 'Updated Name',
        description: 'Updated Description',
      }

      await db.updatePreset(updatedPreset)
      presets = await db.getPresets()
      const updated = presets.find((p) => p.id === presetToUpdate.id)

      expect(updated?.name).toBe('Updated Name')
      expect(updated?.description).toBe('Updated Description')
    })

    it('should preserve other preset properties when updating', async () => {
      let presets = await db.getPresets()
      const original = presets[0]

      const updated: Preset = {
        ...original,
        name: 'New Name',
      }

      await db.updatePreset(updated)
      presets = await db.getPresets()
      const result = presets.find((p) => p.id === original.id)

      expect(result?.author).toBe(original.author)
      expect(result?.sysexData).toEqual(original.sysexData)
      expect(result?.tags).toEqual(original.tags)
    })

    it('should handle updating a non-existent preset gracefully', async () => {
      const fakePreset: Preset = {
        id: uuidv4(),
        name: 'Non-existent',
        createdDate: new Date().toISOString(),
        modifiedDate: new Date().toISOString(),
        filename: 'fake.syx',
        sysexData: new Uint8Array(263),
        tags: [],
      }

      // Should not throw - just returns undefined
      const result = await db.updatePreset(fakePreset)
      expect(result).toBeUndefined()
    })
  })

  describe('deletePreset', () => {
    it('should delete a preset from the database', async () => {
      let presets = await db.getPresets()
      const presetToDelete = presets[0]
      const initialCount = presets.length

      await db.deletePreset(presetToDelete.id)
      presets = await db.getPresets()

      expect(presets.length).toBe(initialCount - 1)
      expect(presets.find((p) => p.id === presetToDelete.id)).toBeUndefined()
    })

    it('should only delete the specified preset', async () => {
      let presets = await db.getPresets()
      const firstPreset = presets[0]
      const secondPreset = presets[1]

      await db.deletePreset(firstPreset.id)
      presets = await db.getPresets()

      expect(presets.find((p) => p.id === secondPreset.id)).toBeDefined()
    })

    it('should handle deleting a non-existent preset gracefully', async () => {
      const fakeId = uuidv4()
      const presets = await db.getPresets()
      const initialCount = presets.length

      await db.deletePreset(fakeId)
      const updated = await db.getPresets()

      expect(updated.length).toBe(initialCount)
    })
  })

  describe('CRUD operations sequence', () => {
    it('should handle add, update, delete sequence', async () => {
      // Add
      const preset: Preset = {
        id: uuidv4(),
        name: 'Sequence Test',
        createdDate: new Date().toISOString(),
        modifiedDate: new Date().toISOString(),
        filename: 'sequence.syx',
        sysexData: new Uint8Array(263),
        tags: ['test'],
      }

      await db.addPreset(preset)
      let presets = await db.getPresets()
      expect(presets.find((p) => p.id === preset.id)).toBeDefined()

      // Update
      const updated: Preset = { ...preset, name: 'Updated Sequence Test' }
      await db.updatePreset(updated)
      presets = await db.getPresets()
      expect(presets.find((p) => p.id === preset.id)?.name).toBe('Updated Sequence Test')

      // Delete
      await db.deletePreset(preset.id)
      presets = await db.getPresets()
      expect(presets.find((p) => p.id === preset.id)).toBeUndefined()
    })
  })
})
