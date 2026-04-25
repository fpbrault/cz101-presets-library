import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { AsidePanelTab } from "@/components/layout/AsidePanelSwitcher";

export const SYNTH_UI_STATE_STORAGE_KEY = "cosmo-pd101-ui-state";

export type MainPanelMode = "phase" | "fx" | "mod";
export type PhaseLinePanelTab =
	| "line1-algos"
	| "line2-algos"
	| "line1-envelopes"
	| "line2-envelopes";
export type EnvTab = "dco" | "dcw" | "dca";

type SynthUiState = {
	activeAsidePanel: AsidePanelTab;
	mainPanelMode: MainPanelMode;
	phaseLinePanelTab: PhaseLinePanelTab;
	activeEnvTab: EnvTab;
	keyboardVisible: boolean;
	libraryModeOpen: boolean;
};

type SynthUiActions = {
	setActiveAsidePanel: (tab: AsidePanelTab) => void;
	setMainPanelMode: (mode: MainPanelMode) => void;
	setPhaseLinePanelTab: (tab: PhaseLinePanelTab) => void;
	setActiveEnvTab: (tab: EnvTab) => void;
	setKeyboardVisible: (visible: boolean) => void;
	setLibraryModeOpen: (open: boolean) => void;
};

export type SynthUiStore = SynthUiState & SynthUiActions;

const ASIDE_PANEL_TABS = new Set<AsidePanelTab>([
	"scope",
	"global",
	"phaseMod",
	"vibrato",
	"filter",
	"chorus",
	"delay",
	"reverb",
]);
const REMOVED_ASIDE_PANEL_FALLBACKS = new Map<string, AsidePanelTab>([
	["portamento", "global"],
]);
const MAIN_PANEL_MODES = new Set<MainPanelMode>(["phase", "fx", "mod"]);
const PHASE_LINE_PANEL_TABS = new Set<PhaseLinePanelTab>([
	"line1-algos",
	"line2-algos",
	"line1-envelopes",
	"line2-envelopes",
]);
const ENV_TABS = new Set<EnvTab>(["dco", "dcw", "dca"]);

const DEFAULT_UI_STATE: SynthUiState = {
	activeAsidePanel: "global",
	mainPanelMode: "phase",
	phaseLinePanelTab: "line1-algos",
	activeEnvTab: "dcw",
	keyboardVisible: true,
	libraryModeOpen: false,
};

const getStringValue = (value: unknown): string | null =>
	typeof value === "string" ? value : null;

const normalizeSynthUiState = (value: unknown): SynthUiState => {
	if (typeof value !== "object" || value === null) {
		return DEFAULT_UI_STATE;
	}

	const candidate = value as Partial<Record<keyof SynthUiState, unknown>>;
	const activeAsidePanel = getStringValue(candidate.activeAsidePanel);
	const mainPanelMode = getStringValue(candidate.mainPanelMode);
	const phaseLinePanelTab = getStringValue(candidate.phaseLinePanelTab);
	const activeEnvTab = getStringValue(candidate.activeEnvTab);

	return {
		activeAsidePanel:
			activeAsidePanel && REMOVED_ASIDE_PANEL_FALLBACKS.has(activeAsidePanel)
				? (REMOVED_ASIDE_PANEL_FALLBACKS.get(activeAsidePanel) ??
					DEFAULT_UI_STATE.activeAsidePanel)
				: activeAsidePanel &&
						ASIDE_PANEL_TABS.has(activeAsidePanel as AsidePanelTab)
					? (activeAsidePanel as AsidePanelTab)
					: DEFAULT_UI_STATE.activeAsidePanel,
		mainPanelMode:
			mainPanelMode && MAIN_PANEL_MODES.has(mainPanelMode as MainPanelMode)
				? (mainPanelMode as MainPanelMode)
				: DEFAULT_UI_STATE.mainPanelMode,
		phaseLinePanelTab:
			phaseLinePanelTab &&
			PHASE_LINE_PANEL_TABS.has(phaseLinePanelTab as PhaseLinePanelTab)
				? (phaseLinePanelTab as PhaseLinePanelTab)
				: DEFAULT_UI_STATE.phaseLinePanelTab,
		activeEnvTab:
			activeEnvTab && ENV_TABS.has(activeEnvTab as EnvTab)
				? (activeEnvTab as EnvTab)
				: DEFAULT_UI_STATE.activeEnvTab,
		keyboardVisible:
			typeof candidate.keyboardVisible === "boolean"
				? candidate.keyboardVisible
				: DEFAULT_UI_STATE.keyboardVisible,
		libraryModeOpen:
			typeof candidate.libraryModeOpen === "boolean"
				? candidate.libraryModeOpen
				: DEFAULT_UI_STATE.libraryModeOpen,
	};
};

export const useSynthUiStore = create<SynthUiStore>()(
	persist(
		(set) => ({
			...DEFAULT_UI_STATE,
			setActiveAsidePanel: (tab) => set({ activeAsidePanel: tab }),
			setMainPanelMode: (mode) => set({ mainPanelMode: mode }),
			setPhaseLinePanelTab: (tab) => set({ phaseLinePanelTab: tab }),
			setActiveEnvTab: (tab) => set({ activeEnvTab: tab }),
			setKeyboardVisible: (visible) => set({ keyboardVisible: visible }),
			setLibraryModeOpen: (open) => set({ libraryModeOpen: open }),
		}),
		{
			name: SYNTH_UI_STATE_STORAGE_KEY,
			storage: createJSONStorage(() => localStorage),
			partialize: (state) => ({
				activeAsidePanel: state.activeAsidePanel,
				mainPanelMode: state.mainPanelMode,
				phaseLinePanelTab: state.phaseLinePanelTab,
				activeEnvTab: state.activeEnvTab,
				keyboardVisible: state.keyboardVisible,
				libraryModeOpen: state.libraryModeOpen,
			}),
			merge: (persistedState, currentState) => ({
				...currentState,
				...normalizeSynthUiState(persistedState),
			}),
		},
	),
);
