import { beforeEach, describe, expect, it } from "vitest";
import {
	SYNTH_UI_STATE_STORAGE_KEY,
	useSynthUiStore,
} from "@/features/synth/synthUiStore";

describe("synthUiStore", () => {
	beforeEach(() => {
		localStorage.clear();
		useSynthUiStore.persist.clearStorage();
		useSynthUiStore.setState({
			activeAsidePanel: "global",
			mainPanelMode: "phase",
			phaseLinePanelTab: "line1-algos",
			activeEnvTab: "dcw",
			keyboardVisible: true,
		});
	});

	it("persists the current synth UI state", async () => {
		useSynthUiStore.getState().setActiveAsidePanel("reverb");
		useSynthUiStore.getState().setMainPanelMode("fx");
		useSynthUiStore.getState().setPhaseLinePanelTab("line2-envelopes");
		useSynthUiStore.getState().setActiveEnvTab("dca");
		useSynthUiStore.getState().setKeyboardVisible(false);
		const savedState = localStorage.getItem(SYNTH_UI_STATE_STORAGE_KEY);

		useSynthUiStore.setState({
			activeAsidePanel: "global",
			mainPanelMode: "phase",
			phaseLinePanelTab: "line1-algos",
			activeEnvTab: "dcw",
			keyboardVisible: true,
		});
		expect(savedState).not.toBeNull();
		localStorage.setItem(SYNTH_UI_STATE_STORAGE_KEY, savedState ?? "");

		await useSynthUiStore.persist.rehydrate();

		expect(useSynthUiStore.getState()).toMatchObject({
			activeAsidePanel: "reverb",
			mainPanelMode: "fx",
			phaseLinePanelTab: "line2-envelopes",
			activeEnvTab: "dca",
			keyboardVisible: false,
		});
	});

	it("falls back to defaults when stored values are invalid", async () => {
		localStorage.setItem(
			SYNTH_UI_STATE_STORAGE_KEY,
			JSON.stringify({
				state: {
					activeAsidePanel: "missing",
					mainPanelMode: "drawer",
					phaseLinePanelTab: "line3-algos",
					activeEnvTab: "pitch",
					keyboardVisible: "nope",
				},
				version: 0,
			}),
		);

		await useSynthUiStore.persist.rehydrate();

		expect(useSynthUiStore.getState()).toMatchObject({
			activeAsidePanel: "global",
			mainPanelMode: "phase",
			phaseLinePanelTab: "line1-algos",
			activeEnvTab: "dcw",
			keyboardVisible: true,
		});
	});

	it("falls back to global when persisted side panel was portamento", async () => {
		localStorage.setItem(
			SYNTH_UI_STATE_STORAGE_KEY,
			JSON.stringify({
				state: {
					activeAsidePanel: "portamento",
				},
				version: 0,
			}),
		);

		await useSynthUiStore.persist.rehydrate();

		expect(useSynthUiStore.getState().activeAsidePanel).toBe("global");
	});

	it("falls back to global when persisted side panel was filter", async () => {
		localStorage.setItem(
			SYNTH_UI_STATE_STORAGE_KEY,
			JSON.stringify({
				state: {
					activeAsidePanel: "filter",
				},
				version: 0,
			}),
		);

		await useSynthUiStore.persist.rehydrate();

		expect(useSynthUiStore.getState().activeAsidePanel).toBe("global");
	});
});
