export type SynthRuntime = "web" | "plugin";

export type SynthRuntimeCapabilities = {
	showUiScaleControl: boolean;
	showVersionIndicator: boolean;
	uiScaleOptions: number[];
};

const WEB_CAPABILITIES: SynthRuntimeCapabilities = {
	showUiScaleControl: false,
	showVersionIndicator: false,
	uiScaleOptions: [],
};

const PLUGIN_CAPABILITIES: SynthRuntimeCapabilities = {
	showUiScaleControl: true,
	showVersionIndicator: true,
	uiScaleOptions: [50, 60, 70, 80, 90, 100],
};

export function getSynthRuntimeCapabilities(
	runtime: SynthRuntime,
): SynthRuntimeCapabilities {
	return runtime === "plugin" ? PLUGIN_CAPABILITIES : WEB_CAPABILITIES;
}
