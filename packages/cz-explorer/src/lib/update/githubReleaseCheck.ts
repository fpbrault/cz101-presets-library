const LATEST_RELEASE_URL =
	"https://api.github.com/repos/fpbrault/cz101-presets-library/releases/latest";
const SESSION_KEY = "cz101.update.latestNotified";

interface GitHubLatestReleaseResponse {
	tag_name?: string;
	html_url?: string;
	prerelease?: boolean;
	draft?: boolean;
}

interface UpdateInfo {
	currentVersion: string;
	latestVersion: string;
	releaseUrl: string;
}

function normalizeVersion(raw: string): string {
	return raw.trim().replace(/^v/i, "").split("-")[0];
}

function parseVersion(raw: string): number[] {
	return normalizeVersion(raw)
		.split(".")
		.map((part) => Number.parseInt(part, 10))
		.filter((part) => Number.isFinite(part));
}

function compareVersions(a: string, b: string): number {
	const av = parseVersion(a);
	const bv = parseVersion(b);
	const maxLength = Math.max(av.length, bv.length);

	for (let index = 0; index < maxLength; index += 1) {
		const left = av[index] ?? 0;
		const right = bv[index] ?? 0;
		if (left > right) return 1;
		if (left < right) return -1;
	}

	return 0;
}

export async function checkForDesktopUpdate(): Promise<UpdateInfo | null> {
	if (!("__TAURI__" in window)) {
		return null;
	}

	try {
		const [{ getVersion }, response] = await Promise.all([
			import("@tauri-apps/api/app"),
			fetch(LATEST_RELEASE_URL, {
				headers: { Accept: "application/vnd.github+json" },
				cache: "no-store",
			}),
		]);

		if (!response.ok) {
			return null;
		}

		const latest = (await response.json()) as GitHubLatestReleaseResponse;
		if (
			latest.draft ||
			latest.prerelease ||
			!latest.tag_name ||
			!latest.html_url
		) {
			return null;
		}

		const currentVersion = await getVersion();
		const latestVersion = normalizeVersion(latest.tag_name);
		const currentNormalized = normalizeVersion(currentVersion);

		if (compareVersions(latestVersion, currentNormalized) <= 0) {
			return null;
		}

		const lastNotified = sessionStorage.getItem(SESSION_KEY);
		if (lastNotified === latestVersion) {
			return null;
		}

		sessionStorage.setItem(SESSION_KEY, latestVersion);

		return {
			currentVersion: currentNormalized,
			latestVersion,
			releaseUrl: latest.html_url,
		};
	} catch {
		return null;
	}
}
