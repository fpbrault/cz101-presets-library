import {
	type ReactNode,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import type { AsidePanelTab } from "@/components/layout/AsidePanelSwitcher";
import SynthRenderer from "@/components/renderer/SynthRenderer";
import { useLcdControlReadout } from "@/features/synth/hooks/useLcdControlReadout";
import { getSynthRuntimeCapabilities } from "@/features/synth/runtimeCapabilities";
import { useSynthPresetManager } from "@/features/synth/useSynthPresetManager";
import { useSynthState } from "@/features/synth/useSynthState";
import { DEFAULT_SYNTH_PRESETS } from "@/lib/synth/defaultPresets";
import { usePluginParamBridge } from "./hooks/usePluginParamBridge";

const UI_SCALE_KEY = "cz-plugin-ui-scale";
const PLUGIN_RUNTIME_CAPABILITIES = getSynthRuntimeCapabilities("plugin");
type UiScale = (typeof PLUGIN_RUNTIME_CAPABILITIES.uiScaleOptions)[number];

type PluginPageProps = {
	headerExtra?: ReactNode;
};

export default function PluginPage({ headerExtra }: PluginPageProps = {}) {
	const synthState = useSynthState();
	const { lineSelect, polyMode, filterEnabled, gatherState, applyPreset } =
		synthState;

	const [uiScale, setUiScale] = useState<UiScale>(() => {
		const saved = localStorage.getItem(UI_SCALE_KEY);
		const parsed = saved ? Number(saved) : 70;
		return (
			PLUGIN_RUNTIME_CAPABILITIES.uiScaleOptions.includes(parsed) ? parsed : 70
		) as UiScale;
	});
	const [scopeActiveHz, setScopeActiveHz] = useState(220);
	const analyserNodeRef = useRef<AnalyserNode | null>(null);
	const audioCtxRef = useRef<AudioContext | null>(null);
	const [activeAsidePanel, setActiveAsidePanel] = useState<AsidePanelTab>(
		"global",
	);
	const { lcdControlReadout, pushLcdControlReadout } = useLcdControlReadout();

	usePluginParamBridge(synthState);

	const subscribeScopeFrames = useCallback(
		(
			onFrame: (frame: {
				samples: Float32Array;
				sampleRate: number;
				hz: number;
			}) => void,
		) => {
			window.__czOnScope = (
				samples: number[],
				sampleRate: number,
				hz: number,
			) => {
				onFrame({
					samples: new Float32Array(samples),
					sampleRate,
					hz,
				});
				setScopeActiveHz(Math.round(hz * 10) / 10);
			};

			return () => {
				window.__czOnScope = undefined;
			};
		},
		[],
	);

	useEffect(() => {
		localStorage.setItem(UI_SCALE_KEY, String(uiScale));
	}, [uiScale]);

	const shouldLoadCurrentState = useCallback(() => !window.ipc, []);

	const {
		allPresetEntries,
		activePresetId,
		activePresetName,
		handleLoadLocal,
		handleLoadBuiltin,
		handleLoadLibrary,
		handleStepPreset,
		handleSavePreset,
		handleDeletePreset,
		handleRenamePreset,
		handleInitPreset,
		handleExportPreset,
		handleImportPreset,
		handleExportCurrentState,
	} = useSynthPresetManager({
		builtinPresets: DEFAULT_SYNTH_PRESETS,
		gatherState,
		applyPreset,
		shouldLoadCurrentState,
	});

	const lcdPrimaryText = useMemo(
		() => `PRESET ${activePresetName.toUpperCase()}`,
		[activePresetName],
	);
	const lcdSecondaryText = useMemo(() => {
		const filterStatus = filterEnabled ? "FILT ON" : "FILT OFF";
		return `LINE ${lineSelect} | ${polyMode.toUpperCase()} | ${filterStatus}`;
	}, [lineSelect, polyMode, filterEnabled]);

	return (
		<SynthRenderer
			synthState={synthState}
			headerProps={{
				allEntries: allPresetEntries,
				activeEntryId: activePresetId,
				activePresetName,
				onLoadLocal: handleLoadLocal,
				onLoadLibrary: handleLoadLibrary,
				onLoadBuiltin: handleLoadBuiltin,
				onStepPreset: handleStepPreset,
				onSavePreset: handleSavePreset,
				onDeletePreset: handleDeletePreset,
				onRenamePreset: handleRenamePreset,
				onInitPreset: handleInitPreset,
				onExportPreset: handleExportPreset,
				onExportCurrentState: handleExportCurrentState,
				onImportPreset: handleImportPreset,
			}}
			frameClassName="h-full bg-cz-panel flex flex-col overflow-hidden gap-4 w-full"
			frameStyle={{ zoom: `${uiScale}%` }}
			headerExtra={
				<>
					{PLUGIN_RUNTIME_CAPABILITIES.showUiScaleControl ? (
						<div className="flex items-center gap-2 px-8 -mt-2">
							<span className="text-3xs font-mono uppercase tracking-[0.2em] text-base-content/50">
								UI Scale
							</span>
							<div className="flex gap-1">
								{PLUGIN_RUNTIME_CAPABILITIES.uiScaleOptions.map(
									(scaleOption) => (
										<button
											key={scaleOption}
											type="button"
											className={`btn btn-xs font-mono ${uiScale === scaleOption ? "btn-primary" : "btn-ghost opacity-50"}`}
											onClick={() => setUiScale(scaleOption as UiScale)}
										>
											{scaleOption}%
										</button>
									),
								)}
							</div>
						</div>
					) : null}
					{headerExtra}
				</>
			}
			lcdPrimaryText={lcdPrimaryText}
			lcdSecondaryText={lcdSecondaryText}
			lcdTransientReadout={lcdControlReadout}
			effectivePitchHz={scopeActiveHz}
			analyserNodeRef={analyserNodeRef}
			audioCtxRef={audioCtxRef}
			subscribeScopeFrames={subscribeScopeFrames}
			activeAsidePanel={activeAsidePanel}
			onAsidePanelChange={setActiveAsidePanel}
			onControlReadout={pushLcdControlReadout}
		/>
	);
}
