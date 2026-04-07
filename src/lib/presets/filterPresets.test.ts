import { v4 as uuidv4 } from "uuid";
import { beforeEach, describe, expect, it } from "vitest";
import { filterPresets } from "@/lib/presets/filterPresets";
import type { Preset } from "@/lib/presets/presetManager";

let _counter = 0;

function makePreset(overrides: Partial<Preset> = {}): Preset {
	const n = _counter++;
	return {
		id: uuidv4(),
		name: "Test Preset",
		createdDate: "2024-01-01T00:00:00.000Z",
		modifiedDate: "2024-01-01T00:00:00.000Z",
		filename: "test.syx",
		// Each preset gets unique sysexData so fingerprints are distinct by default
		sysexData: new Uint8Array([0xf0, 0x44, n & 0xff, (n >> 8) & 0xff, 0xf7]),
		tags: [],
		author: "User",
		description: "",
		isFactoryPreset: false,
		...overrides,
	};
}

const baseOptions = {
	sorting: [],
	searchTerm: "",
	selectedTags: [],
	filterMode: "inclusive" as const,
	userPresetsOnly: false,
	favoritesOnly: false,
	duplicatesOnly: false,
	randomOrder: false,
	seed: 0,
};

describe("filterPresets", () => {
	let presets: Preset[];

	beforeEach(() => {
		_counter = 0;
		presets = [
			makePreset({ name: "Alpha Bass", tags: ["bass"], favorite: true }),
			makePreset({ name: "Beta Pad", tags: ["pad"] }),
			makePreset({ name: "Gamma Lead", tags: ["lead", "synth"] }),
			makePreset({ name: "Delta Bass", tags: ["bass", "synth"] }),
			makePreset({
				id: "factory-id-fixed",
				name: "Factory Brass",
				tags: ["brass"],
				isFactoryPreset: true,
			}),
		];
	});

	it("returns all presets when no filters applied", () => {
		const { presets: result, totalCount } = filterPresets(presets, baseOptions);
		expect(result).toHaveLength(5);
		expect(totalCount).toBe(5);
	});

	it("filters by search term (case-insensitive)", () => {
		const { presets: result, totalCount } = filterPresets(presets, {
			...baseOptions,
			searchTerm: "bass",
		});
		expect(result).toHaveLength(2);
		expect(totalCount).toBe(2);
		expect(result.every((p) => p.name.toLowerCase().includes("bass"))).toBe(
			true,
		);
	});

	it("returns empty when search term matches nothing", () => {
		const { presets: result, totalCount } = filterPresets(presets, {
			...baseOptions,
			searchTerm: "zzznomatch",
		});
		expect(result).toHaveLength(0);
		expect(totalCount).toBe(0);
	});

	it("search is case-insensitive", () => {
		const { presets: result } = filterPresets(presets, {
			...baseOptions,
			searchTerm: "ALPHA",
		});
		expect(result).toHaveLength(1);
		expect(result[0].name).toBe("Alpha Bass");
	});

	it("filters favorites only", () => {
		const { presets: result, totalCount } = filterPresets(presets, {
			...baseOptions,
			favoritesOnly: true,
		});
		expect(result).toHaveLength(1);
		expect(totalCount).toBe(1);
		expect(result[0].name).toBe("Alpha Bass");
	});

	it("returns empty when favoritesOnly and no favorites", () => {
		const noFavPresets = presets.map((p) => ({ ...p, favorite: false }));
		const { presets: result } = filterPresets(noFavPresets, {
			...baseOptions,
			favoritesOnly: true,
		});
		expect(result).toHaveLength(0);
	});

	it("filters user presets only (excludes factory presets)", () => {
		const { presets: result, totalCount } = filterPresets(presets, {
			...baseOptions,
			userPresetsOnly: true,
		});
		expect(result.every((p) => !p.isFactoryPreset)).toBe(true);
		expect(result).toHaveLength(4);
		expect(totalCount).toBe(4);
	});

	it("filters by single tag in inclusive mode", () => {
		const { presets: result } = filterPresets(presets, {
			...baseOptions,
			selectedTags: ["bass"],
			filterMode: "inclusive",
		});
		expect(result).toHaveLength(2);
		expect(result.every((p) => p.tags.includes("bass"))).toBe(true);
	});

	it("filters by multiple tags in inclusive mode (AND)", () => {
		const { presets: result } = filterPresets(presets, {
			...baseOptions,
			selectedTags: ["bass", "synth"],
			filterMode: "inclusive",
		});
		expect(result).toHaveLength(1);
		expect(result[0].name).toBe("Delta Bass");
	});

	it("filters by multiple tags in exclusive mode (OR)", () => {
		const { presets: result } = filterPresets(presets, {
			...baseOptions,
			selectedTags: ["lead", "pad"],
			filterMode: "exclusive",
		});
		expect(result).toHaveLength(2);
		const names = result.map((p) => p.name);
		expect(names).toContain("Beta Pad");
		expect(names).toContain("Gamma Lead");
	});

	it("returns empty when no presets match selected tags", () => {
		const { presets: result } = filterPresets(presets, {
			...baseOptions,
			selectedTags: ["nonexistent-tag"],
			filterMode: "inclusive",
		});
		expect(result).toHaveLength(0);
	});

	it("detects duplicates via sysexData fingerprint", () => {
		const sharedSysex = new Uint8Array([0xf0, 0x01, 0x02, 0xf7]);
		const dup1 = makePreset({ name: "Dup A", sysexData: sharedSysex });
		const dup2 = makePreset({ name: "Dup B", sysexData: sharedSysex });
		const unique = makePreset({
			name: "Unique",
			sysexData: new Uint8Array([0xf0, 0x99, 0xf7]),
		});

		const { presets: result } = filterPresets([dup1, dup2, unique], {
			...baseOptions,
			duplicatesOnly: true,
		});
		expect(result).toHaveLength(2);
		expect(result.every((p) => p.name.startsWith("Dup"))).toBe(true);
	});

	it("returns no results when duplicatesOnly but no duplicates", () => {
		// presets each have unique sysexData (from the counter-based makePreset)
		const { presets: result } = filterPresets(presets, {
			...baseOptions,
			duplicatesOnly: true,
		});
		expect(result).toHaveLength(0);
	});

	it("sorts by name ascending", () => {
		const { presets: result } = filterPresets(presets, {
			...baseOptions,
			sorting: [{ id: "name", desc: false }],
		});
		const names = result.map((p) => p.name);
		expect(names[0]).toBe("Alpha Bass");
		expect(names[names.length - 1]).toBe("Gamma Lead");
	});

	it("sorts by name descending", () => {
		const { presets: result } = filterPresets(presets, {
			...baseOptions,
			sorting: [{ id: "name", desc: true }],
		});
		const names = result.map((p) => p.name);
		expect(names[0]).toBe("Gamma Lead");
		expect(names[names.length - 1]).toBe("Alpha Bass");
	});

	it("sorts by favorite descending (favorites first)", () => {
		const { presets: result } = filterPresets(presets, {
			...baseOptions,
			sorting: [{ id: "favorite", desc: true }],
		});
		expect(result[0].favorite).toBe(true);
	});

	it("shuffles deterministically with the same seed", () => {
		const seed = 42;
		const { presets: run1 } = filterPresets(presets, {
			...baseOptions,
			randomOrder: true,
			seed,
		});
		const { presets: run2 } = filterPresets(presets, {
			...baseOptions,
			randomOrder: true,
			seed,
		});
		expect(run1.map((p) => p.id)).toEqual(run2.map((p) => p.id));
	});

	it("different seeds produce different orderings for large sets", () => {
		const manyPresets = Array.from({ length: 20 }, (_, i) =>
			makePreset({ name: `Preset ${i}` }),
		);
		const { presets: a } = filterPresets(manyPresets, {
			...baseOptions,
			randomOrder: true,
			seed: 1,
		});
		const { presets: b } = filterPresets(manyPresets, {
			...baseOptions,
			randomOrder: true,
			seed: 99,
		});
		expect(a.map((p) => p.id)).not.toEqual(b.map((p) => p.id));
	});

	it("combines search term and tag filter", () => {
		const { presets: result } = filterPresets(presets, {
			...baseOptions,
			searchTerm: "bass",
			selectedTags: ["synth"],
			filterMode: "inclusive",
		});
		expect(result).toHaveLength(1);
		expect(result[0].name).toBe("Delta Bass");
	});

	it("totalCount reflects filtered count before pagination", () => {
		const { totalCount } = filterPresets(presets, {
			...baseOptions,
			selectedTags: ["bass"],
			filterMode: "exclusive",
		});
		expect(totalCount).toBe(2);
	});
});
