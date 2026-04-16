import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { STORAGE_KEYS } from "./keys";
import { clear, getItem, removeItem, setItem } from "./storage";

describe("storage", () => {
	beforeEach(() => {
		localStorage.clear();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("getItem", () => {
		it("returns defaultValue when key is not set", () => {
			expect(getItem(STORAGE_KEYS.AUTO_SEND, false)).toBe(false);
		});

		it("returns defaultValue when key is not set (null default)", () => {
			expect(getItem(STORAGE_KEYS.SELECTED_MIDI_PORT, null)).toBeNull();
		});

		it("returns stored value for a string", () => {
			localStorage.setItem(
				STORAGE_KEYS.SELECTED_MIDI_PORT,
				JSON.stringify("myPort"),
			);
			expect(getItem(STORAGE_KEYS.SELECTED_MIDI_PORT, null)).toBe("myPort");
		});

		it("returns stored value for a boolean", () => {
			localStorage.setItem(STORAGE_KEYS.AUTO_SEND, JSON.stringify(true));
			expect(getItem(STORAGE_KEYS.AUTO_SEND, false)).toBe(true);
		});

		it("returns stored value for a number", () => {
			localStorage.setItem(
				STORAGE_KEYS.SELECTED_MIDI_CHANNEL,
				JSON.stringify(5),
			);
			expect(getItem(STORAGE_KEYS.SELECTED_MIDI_CHANNEL, 1)).toBe(5);
		});

		it("returns stored value for an object", () => {
			const obj = [{ id: "1", name: "Test" }];
			localStorage.setItem(STORAGE_KEYS.PLAYLISTS, JSON.stringify(obj));
			expect(getItem(STORAGE_KEYS.PLAYLISTS, [])).toEqual(obj);
		});

		it("returns defaultValue when stored value is invalid JSON", () => {
			localStorage.setItem(STORAGE_KEYS.AUTO_SEND, "not-valid-json{");
			expect(getItem(STORAGE_KEYS.AUTO_SEND, false)).toBe(false);
		});

		it("returns defaultValue when localStorage throws", () => {
			vi.spyOn(Storage.prototype, "getItem").mockImplementationOnce(() => {
				throw new Error("Storage unavailable");
			});
			expect(getItem(STORAGE_KEYS.AUTO_SEND, false)).toBe(false);
		});
	});

	describe("setItem", () => {
		it("persists a string value", () => {
			setItem(STORAGE_KEYS.SELECTED_MIDI_PORT, "myPort");
			expect(localStorage.getItem(STORAGE_KEYS.SELECTED_MIDI_PORT)).toBe(
				JSON.stringify("myPort"),
			);
		});

		it("persists a boolean value", () => {
			setItem(STORAGE_KEYS.AUTO_SEND, true);
			expect(localStorage.getItem(STORAGE_KEYS.AUTO_SEND)).toBe("true");
		});

		it("persists an object value", () => {
			const obj = [{ id: "1" }];
			setItem(STORAGE_KEYS.PLAYLISTS, obj);
			expect(localStorage.getItem(STORAGE_KEYS.PLAYLISTS)).toBe(
				JSON.stringify(obj),
			);
		});

		it("does not throw when localStorage.setItem fails", () => {
			vi.spyOn(localStorage, "setItem").mockImplementationOnce(() => {
				throw new Error("QuotaExceededError");
			});
			expect(() => setItem(STORAGE_KEYS.AUTO_SEND, true)).not.toThrow();
		});

		it("logs an error when write fails", () => {
			const consoleSpy = vi
				.spyOn(console, "error")
				.mockImplementation(() => {});
			vi.spyOn(localStorage, "setItem").mockImplementationOnce(() => {
				throw new Error("QuotaExceededError");
			});
			setItem(STORAGE_KEYS.AUTO_SEND, true);
			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining(STORAGE_KEYS.AUTO_SEND),
				expect.any(Error),
			);
		});
	});

	describe("removeItem", () => {
		it("removes a stored value", () => {
			localStorage.setItem(STORAGE_KEYS.AUTO_SEND, "true");
			removeItem(STORAGE_KEYS.AUTO_SEND);
			expect(localStorage.getItem(STORAGE_KEYS.AUTO_SEND)).toBeNull();
		});

		it("does not throw when localStorage.removeItem fails", () => {
			vi.spyOn(localStorage, "removeItem").mockImplementationOnce(() => {
				throw new Error("Storage unavailable");
			});
			expect(() => removeItem(STORAGE_KEYS.AUTO_SEND)).not.toThrow();
		});

		it("logs an error when removeItem fails", () => {
			const consoleSpy = vi
				.spyOn(console, "error")
				.mockImplementation(() => {});
			vi.spyOn(localStorage, "removeItem").mockImplementationOnce(() => {
				throw new Error("Storage unavailable");
			});
			removeItem(STORAGE_KEYS.AUTO_SEND);
			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining(STORAGE_KEYS.AUTO_SEND),
				expect.any(Error),
			);
		});
	});

	describe("clear", () => {
		it("clears all stored values", () => {
			localStorage.setItem(STORAGE_KEYS.AUTO_SEND, "true");
			localStorage.setItem(
				STORAGE_KEYS.SELECTED_MIDI_PORT,
				JSON.stringify("p1"),
			);
			clear();
			expect(localStorage.getItem(STORAGE_KEYS.AUTO_SEND)).toBeNull();
			expect(localStorage.getItem(STORAGE_KEYS.SELECTED_MIDI_PORT)).toBeNull();
		});

		it("does not throw when localStorage.clear fails", () => {
			vi.spyOn(localStorage, "clear").mockImplementationOnce(() => {
				throw new Error("Storage unavailable");
			});
			expect(() => clear()).not.toThrow();
		});

		it("logs an error when clear fails", () => {
			const consoleSpy = vi
				.spyOn(console, "error")
				.mockImplementation(() => {});
			vi.spyOn(localStorage, "clear").mockImplementationOnce(() => {
				throw new Error("Storage unavailable");
			});
			clear();
			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining("clear localStorage"),
				expect.any(Error),
			);
		});
	});
});
