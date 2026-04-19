export const LAB_UI_SCALE_OPTIONS = [50, 60, 70, 80, 90, 100] as const;

export type UiScale = (typeof LAB_UI_SCALE_OPTIONS)[number];

export type LabUiState = {
	scopeCycles: number;
	scopeVerticalZoom: number;
	scopeTriggerLevel: number;
	uiScale: UiScale;
};

export type LabUiAction =
	| { type: "setScopeCycles"; value: number }
	| { type: "setScopeVerticalZoom"; value: number }
	| { type: "setScopeTriggerLevel"; value: number }
	| { type: "setUiScale"; value: UiScale };

export function createInitialLabUiState(): LabUiState {
	return {
		scopeCycles: 2,
		scopeVerticalZoom: 1,
		scopeTriggerLevel: 128,
		uiScale: 100,
	};
}

export function isUiScale(value: number): value is UiScale {
	return LAB_UI_SCALE_OPTIONS.includes(value as UiScale);
}

export function labUiReducer(
	state: LabUiState,
	action: LabUiAction,
): LabUiState {
	switch (action.type) {
		case "setScopeCycles":
			return { ...state, scopeCycles: action.value };
		case "setScopeVerticalZoom":
			return { ...state, scopeVerticalZoom: action.value };
		case "setScopeTriggerLevel":
			return { ...state, scopeTriggerLevel: action.value };
		case "setUiScale":
			return { ...state, uiScale: action.value };
		default:
			return state;
	}
}
