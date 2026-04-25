import {
	DEFAULT_SYNTH_PRESETS,
	getSynthRuntimeCapabilities,
	SynthRenderer,
	useLcdControlReadout,
	useNoteHandling,
	useSynthPresetManager,
	useSynthStore,
	useSynthUiStore,
} from "@cosmo/cosmo-pd101";
import {
	type ReactNode,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { usePluginParamBridge } from "./hooks/usePluginParamBridge";

const UI_SCALE_KEY = "cz-plugin-ui-scale";
const PLUGIN_RUNTIME_CAPABILITIES = getSynthRuntimeCapabilities("plugin");
type UiScale = (typeof PLUGIN_RUNTIME_CAPABILITIES.uiScaleOptions)[number];

type PluginPageProps = {
	utilityExtra?: ReactNode;
};

export default function PluginPage({ utilityExtra }: PluginPageProps = {}) {
	const lineSelect = useSynthStore((s) => s.lineSelect);
	const polyMode = useSynthStore((s) => s.polyMode);
	const filterEnabled = useSynthStore((s) => s.filterEnabled);
	const gatherState = useSynthStore((s) => s.gatherState);
	const applyPreset = useSynthStore((s) => s.applyPreset);
	const velocityCurve = useSynthStore((s) => s.velocityCurve);
	const presetStateKey = useSynthStore((s) => JSON.stringify(s.gatherState()));

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
	const activeAsidePanel = useSynthUiStore((s) => s.activeAsidePanel);
	const setActiveAsidePanel = useSynthUiStore((s) => s.setActiveAsidePanel);
	const { lcdControlReadout, pushLcdControlReadout } = useLcdControlReadout();
	const { activeNotes, sendNoteOn, sendNoteOff } = useNoteHandling({
		velocityCurve,
		eventSink: (type, payload) => {
			window.__BEAMER__?.emit?.(type, payload);
		},
	});

	usePluginParamBridge();

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
		pendingPresetChange,
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
		handleSavePendingPresetChange,
		handleDiscardPendingPresetChange,
		handleCancelPendingPresetChange,
	} = useSynthPresetManager({
		builtinPresets: DEFAULT_SYNTH_PRESETS,
		gatherState,
		applyPreset,
		shouldLoadCurrentState,
		presetStateKey,
	});

	const lcdPrimaryText = useMemo(
		() => `PRESET ${activePresetName.toUpperCase()}`,
		[activePresetName],
	);
	const lcdSecondaryText = useMemo(() => {
		const filterStatus = filterEnabled ? "FILT ON" : "FILT OFF";
		return `LINE ${lineSelect} | ${filterStatus}`;
	}, [lineSelect, filterEnabled]);

	return (
		<SynthRenderer
			headerProps={{
				allEntries: allPresetEntries,
				activeEntryId: activePresetId,
				activePresetName,
				pendingPresetChange,
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
				onSavePendingPresetChange: handleSavePendingPresetChange,
				onDiscardPendingPresetChange: handleDiscardPendingPresetChange,
				onCancelPendingPresetChange: handleCancelPendingPresetChange,
			}}
			frameClassName="h-full bg-cz-panel flex flex-col overflow-hidden w-full"
			frameStyle={{ zoom: `${uiScale}%` }}
			bottomBarExtra={
				<>
					{PLUGIN_RUNTIME_CAPABILITIES.showUiScaleControl ? (
						<div className="flex items-center gap-1.5">
							<span className="text-cz-cream/65">Scale</span>
							<select
								value={uiScale}
								onChange={(event) =>
									setUiScale(Number(event.target.value) as UiScale)
								}
								className="h-6 rounded-sm border border-cz-border bg-black/30 px-1.5 text-[0.56rem] font-mono tracking-[0.12em] text-cz-cream/85"
							>
								{PLUGIN_RUNTIME_CAPABILITIES.uiScaleOptions.map(
									(scaleOption) => (
										<option key={scaleOption} value={scaleOption}>
											{scaleOption}%
										</option>
									),
								)}
							</select>
						</div>
					) : null}
					{utilityExtra}
				</>
			}
			lcdPrimaryText={lcdPrimaryText}
			lcdSecondaryText={""}
			lcdTransientReadout={lcdControlReadout}
			effectivePitchHz={scopeActiveHz}
			analyserNodeRef={analyserNodeRef}
			audioCtxRef={audioCtxRef}
			subscribeScopeFrames={subscribeScopeFrames}
			activeAsidePanel={activeAsidePanel}
			onAsidePanelChange={setActiveAsidePanel}
			onControlReadout={pushLcdControlReadout}
			miniKeyboard={{
				activeNotes,
				onNoteOn: sendNoteOn,
				onNoteOff: sendNoteOff,
			}}
		/>
	);
}
