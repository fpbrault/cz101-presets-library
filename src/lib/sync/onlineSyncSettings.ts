import { getItem, STORAGE_KEYS, setItem } from "@/lib/storage";

export interface OnlineSyncSettings {
	enabled: boolean;
}

const DEFAULT_ONLINE_SYNC_SETTINGS: OnlineSyncSettings = {
	enabled: false,
};

export function loadOnlineSyncSettings(): OnlineSyncSettings {
	if (typeof window === "undefined") {
		return DEFAULT_ONLINE_SYNC_SETTINGS;
	}

	const stored = getItem<Partial<OnlineSyncSettings>>(
		STORAGE_KEYS.ONLINE_SYNC_SETTINGS,
		DEFAULT_ONLINE_SYNC_SETTINGS,
	);

	return {
		enabled: Boolean(stored.enabled),
	};
}

export function saveOnlineSyncSettings(settings: OnlineSyncSettings): void {
	if (typeof window === "undefined") {
		return;
	}

	setItem(STORAGE_KEYS.ONLINE_SYNC_SETTINGS, {
		enabled: settings.enabled,
	});
}

export function isOnlineSyncEnabled(): boolean {
	return loadOnlineSyncSettings().enabled;
}
