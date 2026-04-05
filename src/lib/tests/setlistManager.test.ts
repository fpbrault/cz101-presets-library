import { describe, it, expect, beforeEach } from 'vitest'
import {
  createSetlist,
  getSetlists,
  getSetlistById,
  deleteSetlist,
  clearAllSetlists,
  exportAllSetlists,
  importAllSetlists,
  exportSetlist,
  importSetlist,
} from '@/lib/setlistManager'
import type { SetlistEntry } from '@/lib/setlistManager'

function makeEntry(slot: number, data: number[] = [0xf0, 0x44, 0xf7]): SetlistEntry {
  return {
    slot,
    programByte: 0x20 + slot - 1,
    sysexData: new Uint8Array(data),
    isExactLibraryMatch: false,
  }
}

describe('setlistManager', () => {
  beforeEach(() => {
    clearAllSetlists()
  })

  describe('createSetlist', () => {
    it('creates a setlist with correct fields', () => {
      const setlist = createSetlist({
        name: 'My Setlist',
        source: 'internal-16',
        entries: [makeEntry(1)],
      })

      expect(setlist.id).toBeTruthy()
      expect(setlist.name).toBe('My Setlist')
      expect(setlist.source).toBe('internal-16')
      expect(setlist.entries).toHaveLength(1)
      expect(setlist.createdAt).toBeTruthy()
    })

    it('persists sysexData as Uint8Array', () => {
      const entry = makeEntry(1, [0xf0, 0x01, 0x02, 0xf7])
      const setlist = createSetlist({ name: 'Test', source: 'manual', entries: [entry] })
      expect(setlist.entries[0].sysexData).toBeInstanceOf(Uint8Array)
      expect(Array.from(setlist.entries[0].sysexData)).toEqual([0xf0, 0x01, 0x02, 0xf7])
    })

    it('generates a unique ID for each setlist', () => {
      const a = createSetlist({ name: 'A', source: 'manual', entries: [] })
      const b = createSetlist({ name: 'B', source: 'manual', entries: [] })
      expect(a.id).not.toBe(b.id)
    })
  })

  describe('getSetlists', () => {
    it('returns empty array when no setlists exist', () => {
      expect(getSetlists()).toEqual([])
    })

    it('returns all created setlists', () => {
      createSetlist({ name: 'A', source: 'manual', entries: [] })
      createSetlist({ name: 'B', source: 'manual', entries: [] })
      expect(getSetlists()).toHaveLength(2)
    })

    it('returns setlists sorted by createdAt descending', async () => {
      const first = createSetlist({ name: 'First', source: 'manual', entries: [] })
      await new Promise((resolve) => setTimeout(resolve, 2))
      const second = createSetlist({ name: 'Second', source: 'manual', entries: [] })
      const all = getSetlists()
      // List is sorted descending — second (later timestamp) should appear first
      expect(all[0].createdAt >= all[1].createdAt).toBe(true)
      const ids = all.map((s) => s.id)
      expect(ids).toContain(first.id)
      expect(ids).toContain(second.id)
    })

    it('deserializes sysexData back to Uint8Array', () => {
      createSetlist({ name: 'X', source: 'manual', entries: [makeEntry(1, [0xf0, 0xaa, 0xf7])] })
      const all = getSetlists()
      expect(all[0].entries[0].sysexData).toBeInstanceOf(Uint8Array)
      expect(all[0].entries[0].sysexData[1]).toBe(0xaa)
    })
  })

  describe('getSetlistById', () => {
    it('returns the correct setlist by id', () => {
      const created = createSetlist({ name: 'Find Me', source: 'manual', entries: [] })
      const found = getSetlistById(created.id)
      expect(found).toBeDefined()
      expect(found!.name).toBe('Find Me')
    })

    it('returns undefined for a non-existent id', () => {
      expect(getSetlistById('nonexistent-id')).toBeUndefined()
    })
  })

  describe('deleteSetlist', () => {
    it('removes the setlist with the given id', () => {
      const setlist = createSetlist({ name: 'Delete Me', source: 'manual', entries: [] })
      deleteSetlist(setlist.id)
      expect(getSetlistById(setlist.id)).toBeUndefined()
      expect(getSetlists()).toHaveLength(0)
    })

    it('does not throw when deleting a non-existent id', () => {
      expect(() => deleteSetlist('ghost-id')).not.toThrow()
    })

    it('only removes the targeted setlist', () => {
      const a = createSetlist({ name: 'A', source: 'manual', entries: [] })
      const b = createSetlist({ name: 'B', source: 'manual', entries: [] })
      deleteSetlist(a.id)
      const remaining = getSetlists()
      expect(remaining).toHaveLength(1)
      expect(remaining[0].id).toBe(b.id)
    })
  })

  describe('clearAllSetlists', () => {
    it('removes all setlists from storage', () => {
      createSetlist({ name: 'A', source: 'manual', entries: [] })
      createSetlist({ name: 'B', source: 'manual', entries: [] })
      clearAllSetlists()
      expect(getSetlists()).toHaveLength(0)
    })
  })

  describe('exportAllSetlists / importAllSetlists', () => {
    it('roundtrip: exports then replaces via import', () => {
      createSetlist({ name: 'Roundtrip', source: 'internal-16', entries: [makeEntry(1)] })
      const exported = exportAllSetlists()
      clearAllSetlists()
      importAllSetlists(exported, 'replace')
      const restored = getSetlists()
      expect(restored).toHaveLength(1)
      expect(restored[0].name).toBe('Roundtrip')
    })

    it('merge mode appends imported setlists to existing ones', () => {
      createSetlist({ name: 'Original', source: 'manual', entries: [] })
      const original = exportAllSetlists()
      clearAllSetlists()

      createSetlist({ name: 'New', source: 'manual', entries: [] })
      importAllSetlists(original, 'merge')

      expect(getSetlists()).toHaveLength(2)
    })

    it('replace mode replaces existing setlists', () => {
      createSetlist({ name: 'Old', source: 'manual', entries: [] })
      const exported = exportAllSetlists()

      clearAllSetlists()
      createSetlist({ name: 'Unrelated', source: 'manual', entries: [] })
      importAllSetlists(exported, 'replace')

      const all = getSetlists()
      expect(all).toHaveLength(1)
      expect(all[0].name).toBe('Old')
    })
  })

  describe('exportSetlist / importSetlist', () => {
    it('exports a single setlist as JSON string', () => {
      const setlist = createSetlist({ name: 'Solo', source: 'manual', entries: [makeEntry(2)] })
      const json = exportSetlist(setlist.id)
      expect(typeof json).toBe('string')
      const parsed = JSON.parse(json)
      expect(parsed.name).toBe('Solo')
    })

    it('throws when exporting non-existent setlist', () => {
      expect(() => exportSetlist('ghost-id')).toThrow('Setlist not found')
    })

    it('imports a single setlist and assigns a new ID', () => {
      const original = createSetlist({ name: 'Original', source: 'manual', entries: [] })
      const json = exportSetlist(original.id)

      clearAllSetlists()
      const imported = importSetlist(json)

      expect(imported.name).toBe('Original')
      expect(imported.id).not.toBe(original.id) // new ID generated on import
    })

    it('imports setlist with sysexData intact as Uint8Array', () => {
      const entry = makeEntry(1, [0xf0, 0xbb, 0xcc, 0xf7])
      const original = createSetlist({ name: 'WithData', source: 'manual', entries: [entry] })
      const json = exportSetlist(original.id)

      clearAllSetlists()
      const imported = importSetlist(json)

      expect(imported.entries[0].sysexData).toBeInstanceOf(Uint8Array)
      expect(Array.from(imported.entries[0].sysexData)).toEqual([0xf0, 0xbb, 0xcc, 0xf7])
    })
  })
})
