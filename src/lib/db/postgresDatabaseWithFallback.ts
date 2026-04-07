import { IndexedDbPresetDatabase } from "@/lib/db/browserDatabase";
import { PostgresPresetDatabase } from "@/lib/db/postgresDatabase";
import type { Preset, PresetDatabase } from "@/lib/presets/presetManager";

export class PostgresPresetDatabaseWithFallback implements PresetDatabase {
	private postgresDb: PostgresPresetDatabase;
	private localDb: IndexedDbPresetDatabase;

	constructor() {
		this.postgresDb = new PostgresPresetDatabase();
		this.localDb = new IndexedDbPresetDatabase();
	}

	async isAvailable(): Promise<boolean> {
		try {
			await this.postgresDb.getPresets();
			return true;
		} catch {
			return false;
		}
	}

	async getPresets(): Promise<Preset[]> {
		if (await this.isAvailable()) {
			return this.postgresDb.getPresets();
		} else {
			return this.localDb.getPresets();
		}
	}

	async addPreset(preset: Preset): Promise<Preset> {
		if (await this.isAvailable()) {
			await this.postgresDb.addPreset(preset);
		}
		return this.localDb.addPreset(preset);
	}

	async updatePreset(preset: Preset): Promise<void> {
		if (await this.isAvailable()) {
			await this.postgresDb.updatePreset(preset);
		}
		await this.localDb.updatePreset(preset);
	}

	async deletePreset(id: string): Promise<void> {
		if (await this.isAvailable()) {
			await this.postgresDb.deletePreset(id);
		}
		await this.localDb.deletePreset(id);
	}

	async syncPresets(localPresets: Preset[]): Promise<void> {
		if (await this.isAvailable()) {
			await this.postgresDb.syncPresets(localPresets);
		}
	}

	async export(): Promise<string> {
		const presets = await this.getPresets();
		return JSON.stringify(presets);
	}

	async import(json: string): Promise<void> {
		const presets: Preset[] = JSON.parse(json);
		await this.syncPresets(presets);
	}
}
