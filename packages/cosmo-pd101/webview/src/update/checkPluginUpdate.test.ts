import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkForPluginUpdate } from "./checkPluginUpdate";

const SESSION_KEY = "cosmo-pd101.update.latestNotified";
const fetchMock = vi.fn<typeof fetch>();

function mockLatestRelease(payload: Record<string, unknown>, ok = true) {
	fetchMock.mockResolvedValue({
		ok,
		json: async () => payload,
	} as Response);
}

describe("checkForPluginUpdate", () => {
	beforeEach(() => {
		sessionStorage.clear();
		fetchMock.mockReset();
		vi.stubGlobal("fetch", fetchMock);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("returns update info for a newer stable release and stores the notified version", async () => {
		mockLatestRelease({
			tag_name: "v1.2.3",
			html_url: "https://example.com/releases/v1.2.3",
		});

		await expect(checkForPluginUpdate()).resolves.toEqual({
			currentVersion: "0.0.0",
			latestVersion: "1.2.3",
			releaseUrl: "https://example.com/releases/v1.2.3",
			forcedByEnv: false,
		});
		expect(sessionStorage.getItem(SESSION_KEY)).toBe("1.2.3");
	});

	it("suppresses duplicate automatic notifications for the same release", async () => {
		mockLatestRelease({
			tag_name: "v1.2.3",
			html_url: "https://example.com/releases/v1.2.3",
		});
		await expect(checkForPluginUpdate()).resolves.not.toBeNull();

		mockLatestRelease({
			tag_name: "v1.2.3",
			html_url: "https://example.com/releases/v1.2.3",
		});
		await expect(checkForPluginUpdate()).resolves.toBeNull();
	});

	it("allows manual checks to bypass the duplicate-notification guard", async () => {
		sessionStorage.setItem(SESSION_KEY, "1.2.3");
		mockLatestRelease({
			tag_name: "v1.2.3",
			html_url: "https://example.com/releases/v1.2.3",
		});

		await expect(checkForPluginUpdate({ manual: true })).resolves.toEqual({
			currentVersion: "0.0.0",
			latestVersion: "1.2.3",
			releaseUrl: "https://example.com/releases/v1.2.3",
			forcedByEnv: false,
		});
	});

	it("ignores prerelease payloads", async () => {
		mockLatestRelease({
			tag_name: "v9.9.9-beta.1",
			html_url: "https://example.com/releases/v9.9.9-beta.1",
			prerelease: true,
		});

		await expect(checkForPluginUpdate()).resolves.toBeNull();
	});
});
