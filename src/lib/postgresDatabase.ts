import { Preset, PresetDatabase } from './presetManager'
import { Client } from 'pg'

const client = new Client({
  connectionString: 'postgresql://user:password@localhost:5432/presets',
})

client.connect()

export class PostgresPresetDatabase implements PresetDatabase {
  async getPresets(): Promise<Preset[]> {
    const res = await client.query('SELECT * FROM presets')
    return res.rows
  }

  async addPreset(preset: Preset): Promise<void> {
    await client.query(
      'INSERT INTO presets (id, name, createdDate, modifiedDate, filename, sysexData, tags, author, description) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
      [
        preset.id,
        preset.name,
        preset.createdDate,
        preset.modifiedDate,
        preset.filename,
        preset.sysexData,
        preset.tags,
        preset.author,
        preset.description,
      ],
    )
  }

  async updatePreset(preset: Preset): Promise<void> {
    await client.query(
      'UPDATE presets SET name = $2, createdDate = $3, modifiedDate = $4, filename = $5, sysexData = $6, tags = $7, author = $8, description = $9 WHERE id = $1',
      [
        preset.id,
        preset.name,
        preset.createdDate,
        preset.modifiedDate,
        preset.filename,
        preset.sysexData,
        preset.tags,
        preset.author,
        preset.description,
      ],
    )
  }

  async deletePreset(id: string): Promise<void> {
    await client.query('DELETE FROM presets WHERE id = $1', [id])
  }

  async syncPresets(_localPresets: Preset[]): Promise<void> {
    // Implement synchronization logic here
  }

  async isAvailable(): Promise<boolean> {
    try {
      await client.query('SELECT 1')
      return true
    } catch {
      return false
    }
  }

  async export(): Promise<string> {
    const presets = await this.getPresets()
    return JSON.stringify(presets)
  }

  async import(json: string): Promise<void> {
    const presets: Preset[] = JSON.parse(json)
    await this.syncPresets(presets)
  }
}
