import type { Preset, PresetDatabase } from "@/lib/presets/presetManager";

const DB_NAME = "PresetDatabase";
const STORE_NAME = "presets";
const DB_VERSION = 1;

function openDatabase(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, DB_VERSION);

		request.onupgradeneeded = (event) => {
			const db = (event.target as IDBOpenDBRequest).result;
			if (!db.objectStoreNames.contains(STORE_NAME)) {
				db.createObjectStore(STORE_NAME, { keyPath: "id" });
			}
		};

		request.onsuccess = (event) => {
			resolve((event.target as IDBOpenDBRequest).result);
		};

		request.onerror = (event) => {
			reject((event.target as IDBOpenDBRequest).error);
		};
	});
}

export class IndexedDbPresetDatabase implements PresetDatabase {
	async getPresets(): Promise<Preset[]> {
		const db = await openDatabase();
		return new Promise((resolve, reject) => {
			const transaction = db.transaction(STORE_NAME, "readonly");
			const store = transaction.objectStore(STORE_NAME);
			const request = store.getAll();

			request.onsuccess = () => {
				resolve(request.result as Preset[]);
			};

			request.onerror = () => {
				reject(request.error);
			};
		});
	}

	async addPreset(preset: Preset): Promise<Preset> {
		const db = await openDatabase();
		return new Promise((resolve, reject) => {
			const transaction = db.transaction(STORE_NAME, "readwrite");
			const store = transaction.objectStore(STORE_NAME);
			const request = store.add(preset);

			request.onsuccess = () => {
				resolve(preset);
			};

			request.onerror = () => {
				reject(request.error);
			};
		});
	}

	async updatePreset(preset: Preset): Promise<void> {
		const db = await openDatabase();
		return new Promise((resolve, reject) => {
			const transaction = db.transaction(STORE_NAME, "readwrite");
			const store = transaction.objectStore(STORE_NAME);
			const request = store.put(preset);

			request.onsuccess = () => {
				resolve();
			};

			request.onerror = () => {
				reject(request.error);
			};
		});
	}

	async deletePreset(id: string): Promise<void> {
		const db = await openDatabase();
		return new Promise((resolve, reject) => {
			const transaction = db.transaction(STORE_NAME, "readwrite");
			const store = transaction.objectStore(STORE_NAME);
			const request = store.delete(id);

			request.onsuccess = () => {
				resolve();
			};

			request.onerror = () => {
				reject(request.error);
			};
		});
	}

	async syncPresets(localPresets: Preset[]): Promise<void> {
		const db = await openDatabase();
		return new Promise((resolve, reject) => {
			const transaction = db.transaction(STORE_NAME, "readwrite");
			const store = transaction.objectStore(STORE_NAME);
			const request = store.clear();

			request.onsuccess = () => {
				const addRequests = localPresets.map((preset) => store.add(preset));
				Promise.all(addRequests).then(() => {
					resolve();
				});
			};

			request.onerror = () => {
				console.error(request.error);
				reject(request.error);
			};
		});
	}

	async isAvailable(): Promise<boolean> {
		return new Promise((resolve) => {
			const request = indexedDB.open(DB_NAME, DB_VERSION);

			request.onsuccess = () => {
				resolve(true);
				request.result.close();
			};

			request.onerror = () => {
				resolve(false);
			};
		});
	}

	async export(): Promise<string> {
		const presets = await this.getPresets();
		const serializedPresets = presets.map((preset) => ({
			...preset,
			sysexData: Array.from(preset.sysexData),
		}));
		return JSON.stringify(serializedPresets);
	}

	async import(json: string): Promise<void> {
		const serializedPresets: Array<
			Omit<Preset, "sysexData"> & { sysexData: number[] }
		> = JSON.parse(json);
		const presets: Preset[] = serializedPresets.map((preset) => ({
			...preset,
			sysexData: Uint8Array.from(preset.sysexData),
		}));
		await this.syncPresets(presets);
	}
}
