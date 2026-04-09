import type { StorageKey } from "./keys";

export function getItem<T>(key: StorageKey, defaultValue: T): T {
	try {
		const item = localStorage.getItem(key);
		if (item === null) {
			return defaultValue;
		}
		return JSON.parse(item) as T;
	} catch {
		return defaultValue;
	}
}

export function setItem<T>(key: StorageKey, value: T): void {
	try {
		localStorage.setItem(key, JSON.stringify(value));
	} catch (error) {
		console.error(`Failed to save ${key} to localStorage:`, error);
	}
}

export function removeItem(key: StorageKey): void {
	try {
		localStorage.removeItem(key);
	} catch (error) {
		console.error(`Failed to remove ${key} from localStorage:`, error);
	}
}

export function clear(): void {
	try {
		localStorage.clear();
	} catch (error) {
		console.error("Failed to clear localStorage:", error);
	}
}
