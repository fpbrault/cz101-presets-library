export const PD101_UI_SCALE_OPTIONS = [50, 60, 70, 80, 90, 100] as const;

export type UiScale = (typeof PD101_UI_SCALE_OPTIONS)[number];

export type Pd101UiState = {
	scopeCycles: number;
	scopeVerticalZoom: number;
	scopeTriggerLevel: number;
	uiScale: UiScale;
};

export type Pd101UiAction =
	| { type: "setScopeCycles"; value: number }
	| { type: "setScopeVerticalZoom"; value: number }
	| { type: "setScopeTriggerLevel"; value: number }
	| { type: "setUiScale"; value: UiScale };

export function createInitialPd101UiState(): Pd101UiState {
	return {
		scopeCycles: 2,
		scopeVerticalZoom: 1,
		scopeTriggerLevel: 128,
		uiScale: 100,
	};
}

export function isUiScale(value: unknown): value is UiScale {
	return (
		typeof value === "number" &&
		PD101_UI_SCALE_OPTIONS.includes(value as UiScale)
	);
}

export function pd101UiReducer(
	state: Pd101UiState,
	action: Pd101UiAction,
): Pd101UiState {
	switch (action.type) {
		case "setScopeCycles":
			return { ...state, scopeCycles: action.value };
		case "setScopeVerticalZoom":
			return { ...state, scopeVerticalZoom: action.value };
		case "setScopeTriggerLevel":
			return { ...state, scopeTriggerLevel: action.value };
		case "setUiScale":
			return { ...state, uiScale: action.value };
		default: {
			const exhaustiveAction: never = action;
			return exhaustiveAction;
		}
	}
}