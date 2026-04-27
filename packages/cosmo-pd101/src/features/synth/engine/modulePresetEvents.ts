import type {
	ModulePresetModule,
	ModulePresetPatch,
} from "@/lib/synth/modulePresets";

const APPLY_MODULE_PRESET_EVENT = "cz-apply-module-preset";

export type ApplyModulePresetRequest = {
	module: ModulePresetModule;
	preset: string;
	patch: ModulePresetPatch;
};

export function requestApplyModulePreset(request: ApplyModulePresetRequest) {
	if (typeof window === "undefined") {
		return;
	}
	window.dispatchEvent(
		new CustomEvent<ApplyModulePresetRequest>(APPLY_MODULE_PRESET_EVENT, {
			detail: request,
		}),
	);
}

export function subscribeApplyModulePreset(
	handler: (request: ApplyModulePresetRequest) => void,
) {
	const listener = (event: Event) => {
		const detail = (event as CustomEvent<ApplyModulePresetRequest>).detail;
		if (!detail) {
			return;
		}
		handler(detail);
	};

	window.addEventListener(APPLY_MODULE_PRESET_EVENT, listener);
	return () => window.removeEventListener(APPLY_MODULE_PRESET_EVENT, listener);
}
