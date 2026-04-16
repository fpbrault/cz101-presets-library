import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getNeonOnlineSession } from "@/lib/auth/neonAuthClient";
import type { Preset } from "@/lib/presets/presetManager";
import { saveOnlineSyncSettings } from "@/lib/sync/onlineSyncSettings";
import { buildRemotePresetSyncAdapterFromSettings } from "@/lib/sync/remotePresetSyncAdapter";
import * as cryptoUtils from "@/lib/utils/crypto";

const mockUpsert = vi.fn();
const mockSelectSingle = vi.fn();

vi.mock("@neondatabase/neon-js", () => ({
	createClient: vi.fn(() => ({
		from: vi.fn(() => ({
			upsert: mockUpsert,
			select: vi.fn(() => ({
				single: mockSelectSingle,
			})),
		})),
	})),
}));

vi.mock("@/lib/auth/neonAuthClient", () => ({
	getNeonOnlineSession: vi.fn(),
}));

vi.mock("@/lib/utils/crypto", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@/lib/utils/crypto")>();
	return {
		...actual,
		deriveKeyFromSession: vi.fn(),
		encryptPresetData: vi.fn(),
		decryptPresetData: vi.fn(),
	};
});

const makePreset = (id: string): Preset =>
	({
		id,
		name: "Test",
		createdDate: "",
		modifiedDate: "",
		filename: "test.syx",
		sysexData: new Uint8Array([0xf0, 0xf7]),
		tags: [],
	}) as Preset;

describe("buildRemotePresetSyncAdapterFromSettings", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		localStorage.clear();
		vi.stubEnv("VITE_NEON_AUTH_URL", "https://example.neonauth.com/auth");
		vi.stubEnv("VITE_NEON_DATA_API_URL", "https://example.apirest.com/rest/v1");

		vi.mocked(getNeonOnlineSession).mockResolvedValue({
			userId: "user-123",
			displayName: "Test User",
			provider: "google",
		});
		vi.mocked(cryptoUtils.deriveKeyFromSession).mockResolvedValue(
			{} as CryptoKey,
		);
		vi.mocked(cryptoUtils.encryptPresetData).mockResolvedValue(
			"encrypted-base64",
		);
	});

	afterEach(() => {
		vi.unstubAllEnvs();
	});

	it("returns disabled adapter when sync is not enabled", async () => {
		saveOnlineSyncSettings({ enabled: false });
		const adapter = buildRemotePresetSyncAdapterFromSettings();

		expect(adapter.isAvailable).toBeTypeOf("function");
		await expect(adapter.isAvailable?.()).resolves.toBe(false);
	});

	it("returns enabled adapter when sync is enabled", async () => {
		saveOnlineSyncSettings({ enabled: true });
		const adapter = buildRemotePresetSyncAdapterFromSettings();

		expect(adapter.isAvailable).toBeTypeOf("function");
		await expect(adapter.isAvailable?.()).resolves.toBe(true);
	});

	it("push encrypts and upserts data correctly", async () => {
		saveOnlineSyncSettings({ enabled: true });
		const adapter = buildRemotePresetSyncAdapterFromSettings();
		mockUpsert.mockResolvedValue({ error: null });

		await adapter.push([makePreset("p1")]);

		expect(cryptoUtils.deriveKeyFromSession).toHaveBeenCalledWith(
			"user-123",
			expect.any(Uint8Array),
		);
		expect(cryptoUtils.encryptPresetData).toHaveBeenCalledWith(
			expect.any(String),
			expect.anything(),
			expect.any(Uint8Array),
		);
		expect(mockUpsert).toHaveBeenCalledWith(
			expect.objectContaining({
				presets_encrypted: "encrypted-base64",
				updated_at: expect.any(String),
			}),
		);
	});

	it("pull decrypts and deserializes data correctly", async () => {
		saveOnlineSyncSettings({ enabled: true });
		const adapter = buildRemotePresetSyncAdapterFromSettings();
		const presetData = [makePreset("p1")];

		mockSelectSingle.mockResolvedValue({
			data: { presets_encrypted: "stored-base64" },
			error: null,
		});
		vi.mocked(cryptoUtils.decryptPresetData).mockResolvedValue(
			JSON.stringify([
				{
					...presetData[0],
					sysexData: Array.from(presetData[0].sysexData),
				},
			]),
		);

		await expect(adapter.pull()).resolves.toEqual(presetData);
		expect(cryptoUtils.decryptPresetData).toHaveBeenCalledWith(
			"stored-base64",
			"user-123",
		);
	});

	it("pull returns null if no data is returned by the API", async () => {
		saveOnlineSyncSettings({ enabled: true });
		const adapter = buildRemotePresetSyncAdapterFromSettings();

		mockSelectSingle.mockResolvedValue({
			data: null,
			error: { code: "PGRST116" },
		});

		await expect(adapter.pull()).resolves.toBeNull();
	});

	it("pull returns empty array if no encrypted data is found", async () => {
		saveOnlineSyncSettings({ enabled: true });
		const adapter = buildRemotePresetSyncAdapterFromSettings();

		mockSelectSingle.mockResolvedValue({
			data: { presets_encrypted: null },
			error: null,
		});

		await expect(adapter.pull()).resolves.toEqual([]);
	});

	it("throws when pushing without an auth session", async () => {
		saveOnlineSyncSettings({ enabled: true });
		const adapter = buildRemotePresetSyncAdapterFromSettings();
		vi.mocked(getNeonOnlineSession).mockResolvedValue(null);

		await expect(adapter.push([makePreset("p1")])).rejects.toThrow(
			"No auth session available for encryption",
		);
	});
});
