import { createClient } from "@neondatabase/neon-js";
import { getNeonOnlineSession } from "@/lib/auth/neonAuthClient";
import type { Preset } from "@/lib/presets/presetManager";
import { setPresetSyncAdapter } from "@/lib/presets/presetManager";
import { loadOnlineSyncSettings } from "@/lib/sync/onlineSyncSettings";
import type { RemotePresetSyncAdapter } from "@/lib/sync/presetSync";
import {
	decryptPresetData,
	deriveKeyFromSession,
	encryptPresetData,
	SALT_LENGTH,
} from "@/lib/utils/crypto";

type SerializedPreset = Omit<Preset, "sysexData"> & { sysexData: number[] };

function serializePresets(presets: Preset[]): SerializedPreset[] {
	return presets.map((p) => ({
		...p,
		sysexData: Array.from(p.sysexData),
	})) as any;
}

function deserializePresets(rows: SerializedPreset[]): Preset[] {
	return rows.map((p) => ({
		...p,
		sysexData: new Uint8Array(p.sysexData as any),
	})) as unknown as Preset[];
}

function getNeonDataClient() {
	const authUrl = import.meta.env.VITE_NEON_AUTH_URL;
	const dataApiUrl = import.meta.env.VITE_NEON_DATA_API_URL;
	if (!authUrl || !dataApiUrl) {
		throw new Error("Missing VITE_NEON_AUTH_URL or VITE_NEON_DATA_API_URL");
	}
	return createClient({ auth: { url: authUrl }, dataApi: { url: dataApiUrl } });
}

class DisabledRemotePresetSyncAdapter implements RemotePresetSyncAdapter {
	async push(_presets: Preset[]): Promise<void> {}
	async pull(): Promise<Preset[] | null> {
		return null;
	}
	async isAvailable(): Promise<boolean> {
		return false;
	}
}

class NeonDataApiPresetSyncAdapter implements RemotePresetSyncAdapter {
	async isAvailable(): Promise<boolean> {
		return Boolean(
			import.meta.env.VITE_NEON_AUTH_URL &&
				import.meta.env.VITE_NEON_DATA_API_URL,
		);
	}

	async push(presets: Preset[]): Promise<void> {
		const client = getNeonDataClient();
		const session = await getNeonOnlineSession();
		if (!session) {
			throw new Error("No auth session available for encryption");
		}
		const sessionToken = session.userId;

		const serialized = serializePresets(presets);
		const jsonString = JSON.stringify(serialized);

		const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
		const key = await deriveKeyFromSession(sessionToken, salt);
		const base64Payload = await encryptPresetData(jsonString, key, salt);

		const { error } = await (client as any).from("preset_library").upsert({
			presets_encrypted: base64Payload,
			updated_at: new Date().toISOString(),
		});

		if (error) {
			throw new Error(`Backup failed: ${error.message}`);
		}
	}

	async pull(): Promise<Preset[] | null> {
		const client = getNeonDataClient();
		const session = await getNeonOnlineSession();
		if (!session) {
			throw new Error("No auth session available for decryption");
		}
		const sessionToken = session.userId;

		const { data, error } = await (client as any)
			.from("preset_library")
			.select("presets_encrypted")
			.single();

		if (error?.code === "PGRST116") {
			return null;
		}
		if (error) {
			throw new Error(`Restore failed: ${error.message}`);
		}

		const base64Payload = data?.presets_encrypted;
		if (!base64Payload) {
			return [];
		}

		const decryptedJsonString = await decryptPresetData(
			base64Payload,
			sessionToken,
		);
		const deserialized = JSON.parse(decryptedJsonString) as SerializedPreset[];

		return deserializePresets(deserialized);
	}
}

export function buildRemotePresetSyncAdapterFromSettings(): RemotePresetSyncAdapter {
	const settings = loadOnlineSyncSettings();

	if (!settings.enabled) {
		return new DisabledRemotePresetSyncAdapter();
	}

	return new NeonDataApiPresetSyncAdapter();
}

export function configurePresetSyncAdapterFromSettings(): void {
	setPresetSyncAdapter(buildRemotePresetSyncAdapterFromSettings());
}
