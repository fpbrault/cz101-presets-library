export const STORAGE_KEYS = {
	FACTORY_PRESETS_ONBOARDING: "cz101.factory-presets.onboarding.v1",
	ONLINE_AUTH_SESSION: "cz101.online-auth-session.v1",
	ONLINE_SYNC_SETTINGS: "cz101.online-sync-settings.v1",
	SELECTED_MIDI_CHANNEL: "selectedMidiChannel",
	SELECTED_MIDI_PORT: "selectedMidiPort",
	USER_PRESETS_ONLY: "userPresetsOnly",
	AUTO_SEND: "autoSend",
	PLAYLISTS: "cz101Playlists",
	SETLISTS: "cz101Setlists",
	SYNTH_BACKUPS: "cz101SynthBackups",
	CZ101_SETLISTS: "cz101SetlistsLegacy",
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];
