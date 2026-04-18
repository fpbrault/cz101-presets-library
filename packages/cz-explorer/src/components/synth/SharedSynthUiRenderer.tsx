import type { CSSProperties, ReactNode, RefObject } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { computeWaveform, type StepEnvData } from "@/components/pdAlgorithms";
import {
	drawPhaseMap,
	drawScope,
	drawSingleScope,
} from "@/components/pdCanvas";
import ChorusPanel from "@/components/synth/ChorusPanel";
import DelayPanel from "@/components/synth/DelayPanel";
import GlobalVoicePanel from "@/components/synth/GlobalVoicePanel";
import LfoPanel from "@/components/synth/LfoPanel";
import type { LineSelect } from "@/components/synth/PhaseLinesSection";
import PhaseModPanel from "@/components/synth/PhaseModPanel";
import PortamentoPanel from "@/components/synth/PortamentoPanel";
import ReverbPanel from "@/components/synth/ReverbPanel";
import ScopePanel from "@/components/synth/ScopePanel";
import SynthFilterPanel from "@/components/synth/SynthFilterPanel";
import type { SynthHeaderProps } from "@/components/synth/SynthHeader";
import SynthUiLayout, {
	DEFAULT_SYNTH_ASIDE_TABS,
	type DefaultAsidePanelTab,
} from "@/components/synth/SynthUiLayout";
import VibratoPanel from "@/components/synth/VibratoPanel";
import type { UseSynthStateResult } from "@/features/synth/useSynthState";

export type AsidePanelTab = DefaultAsidePanelTab;

type SharedSynthUiStateInit = {
	defaultAsidePanel?: AsidePanelTab;
	defaultPhaseLineTab?: "line1" | "line2";
	defaultScopeCycles?: number;
	defaultScopeVerticalZoom?: number;
	defaultScopeTriggerLevel?: number;
};

export type SharedSynthUiState = {
	activeAsidePanel: AsidePanelTab;
	setActiveAsidePanel: (tab: AsidePanelTab) => void;
	activePhaseLineTab: "line1" | "line2";
	setActivePhaseLineTab: (tab: "line1" | "line2") => void;
	scopeCycles: number;
	setScopeCycles: (cycles: number) => void;
	scopeVerticalZoom: number;
	setScopeVerticalZoom: (zoom: number) => void;
	scopeTriggerLevel: number;
	setScopeTriggerLevel: (level: number) => void;
};

export function useSharedSynthUiState(
	init: SharedSynthUiStateInit = {},
): SharedSynthUiState {
	const [activeAsidePanel, setActiveAsidePanel] = useState<AsidePanelTab>(
		init.defaultAsidePanel ?? "scope",
	);
	const [activePhaseLineTab, setActivePhaseLineTab] = useState<
		"line1" | "line2"
	>(init.defaultPhaseLineTab ?? "line1");
	const [scopeCycles, setScopeCycles] = useState(init.defaultScopeCycles ?? 2);
	const [scopeVerticalZoom, setScopeVerticalZoom] = useState(
		init.defaultScopeVerticalZoom ?? 1,
	);
	const [scopeTriggerLevel, setScopeTriggerLevel] = useState(
		init.defaultScopeTriggerLevel ?? 128,
	);

	return {
		activeAsidePanel,
		setActiveAsidePanel,
		activePhaseLineTab,
		setActivePhaseLineTab,
		scopeCycles,
		setScopeCycles,
		scopeVerticalZoom,
		setScopeVerticalZoom,
		scopeTriggerLevel,
		setScopeTriggerLevel,
	};
}

type EnvOverrideHandlers = {
	onLine1DcoEnvChange?: (next: StepEnvData) => void;
	onLine1DcwEnvChange?: (next: StepEnvData) => void;
	onLine1DcaEnvChange?: (next: StepEnvData) => void;
	onLine2DcoEnvChange?: (next: StepEnvData) => void;
	onLine2DcwEnvChange?: (next: StepEnvData) => void;
	onLine2DcaEnvChange?: (next: StepEnvData) => void;
};

type SharedSynthUiRendererProps = {
	synthState: UseSynthStateResult;
	headerProps: SynthHeaderProps;
	frameClassName: string;
	frameStyle?: CSSProperties;
	headerExtra?: ReactNode;
	lcdPrimaryText: string;
	lcdSecondaryText: string;
	lcdTransientReadout?: {
		label: string;
		value: string;
	} | null;
	effectiveIntPmAmount: number;
	effectivePitchHz: number;
	oscilloscopeCanvasRef: RefObject<HTMLCanvasElement | null>;
	uiState: SharedSynthUiState;
	envOverrideHandlers?: EnvOverrideHandlers;
};

export default function SharedSynthUiRenderer({
	synthState,
	headerProps,
	frameClassName,
	frameStyle,
	headerExtra,
	lcdPrimaryText,
	lcdSecondaryText,
	lcdTransientReadout = null,
	effectiveIntPmAmount,
	effectivePitchHz,
	oscilloscopeCanvasRef,
	uiState,
	envOverrideHandlers,
}: SharedSynthUiRendererProps) {
	const {
		warpAAmount,
		warpBAmount,
		warpAAlgo,
		warpBAlgo,
		algo2A,
		algo2B,
		algoBlendA,
		algoBlendB,
		intPmRatio,
		pmPre,
		windowType,
		line1Level,
		line2Level,
		line1DcoDepth,
		line2DcoDepth,
		line1DcwComp,
		line2DcwComp,
		line1Octave,
		line2Octave,
		line1Detune,
		line2Detune,
		line1DcoEnv,
		line1DcwEnv,
		line1DcaEnv,
		line2DcoEnv,
		line2DcwEnv,
		line2DcaEnv,
		line1DcwKeyFollow,
		line2DcwKeyFollow,
		lineSelect,
		setLineSelect,
		modMode,
		setModMode,
		setWarpAAmount,
		setWarpBAmount,
		setWarpAAlgo,
		setWarpBAlgo,
		setAlgo2A,
		setAlgo2B,
		setAlgoBlendA,
		setAlgoBlendB,
		setLine1DcwComp,
		setLine2DcwComp,
		setLine1Level,
		setLine2Level,
		setLine1Octave,
		setLine2Octave,
		setLine1Detune,
		setLine2Detune,
		setLine1DcoDepth,
		setLine2DcoDepth,
		setLine1DcoEnv,
		setLine1DcwEnv,
		setLine1DcaEnv,
		setLine2DcoEnv,
		setLine2DcwEnv,
		setLine2DcaEnv,
		setLine1DcwKeyFollow,
		setLine2DcwKeyFollow,
		volume,
		setVolume,
		polyMode,
		setPolyMode,
		velocityTarget,
		setVelocityTarget,
		pitchBendRange,
		setPitchBendRange,
		modWheelVibratoDepth,
		setModWheelVibratoDepth,
		phaseModEnabled,
		setPhaseModEnabled,
		intPmAmount,
		setIntPmAmount,
		setIntPmRatio,
		setPmPre,
		vibratoEnabled,
		setVibratoEnabled,
		vibratoWave,
		setVibratoWave,
		vibratoRate,
		setVibratoRate,
		vibratoDepth,
		setVibratoDepth,
		vibratoDelay,
		setVibratoDelay,
		portamentoEnabled,
		setPortamentoEnabled,
		portamentoMode,
		setPortamentoMode,
		portamentoRate,
		setPortamentoRate,
		portamentoTime,
		setPortamentoTime,
		lfoEnabled,
		setLfoEnabled,
		lfoWaveform,
		setLfoWaveform,
		lfoRate,
		setLfoRate,
		lfoDepth,
		setLfoDepth,
		lfoOffset,
		setLfoOffset,
		lfoTarget,
		setLfoTarget,
		filterEnabled,
		setFilterEnabled,
		filterType,
		setFilterType,
		filterCutoff,
		setFilterCutoff,
		filterResonance,
		setFilterResonance,
		filterEnvAmount,
		setFilterEnvAmount,
		chorusEnabled,
		setChorusEnabled,
		chorusRate,
		setChorusRate,
		chorusDepth,
		setChorusDepth,
		chorusMix,
		setChorusMix,
		delayEnabled,
		setDelayEnabled,
		delayTime,
		setDelayTime,
		delayFeedback,
		setDelayFeedback,
		delayMix,
		setDelayMix,
		reverbEnabled,
		setReverbEnabled,
		reverbSize,
		setReverbSize,
		reverbMix,
		setReverbMix,
	} = synthState;

	const line1CanvasRef = useRef<HTMLCanvasElement>(null);
	const line2CanvasRef = useRef<HTMLCanvasElement>(null);
	const combinedCanvasRef = useRef<HTMLCanvasElement>(null);
	const phaseCanvasRef = useRef<HTMLCanvasElement>(null);

	const sustainLevel1 = line1DcwEnv.steps[line1DcwEnv.sustainStep]?.level ?? 1;
	const sustainLevelA = line1DcaEnv.steps[line1DcaEnv.sustainStep]?.level ?? 1;
	const sustainLevel2 = line2DcwEnv.steps[line2DcwEnv.sustainStep]?.level ?? 1;
	const sustainLevelB = line2DcaEnv.steps[line2DcaEnv.sustainStep]?.level ?? 1;

	const waveform = useMemo(
		() =>
			computeWaveform({
				warpAAmount: warpAAmount * sustainLevel1,
				warpBAmount: warpBAmount * sustainLevel2,
				warpAAlgo,
				warpBAlgo,
				algo2A,
				algo2B,
				algoBlendA,
				algoBlendB,
				intPmAmount: effectiveIntPmAmount,
				intPmRatio,
				extPmAmount: 0,
				pmPre,
				windowType,
				line1Level: line1Level * sustainLevelA,
				line2Level: line2Level * sustainLevelB,
			}),
		[
			warpAAmount,
			warpBAmount,
			sustainLevel1,
			sustainLevel2,
			warpAAlgo,
			warpBAlgo,
			algo2A,
			algo2B,
			algoBlendA,
			algoBlendB,
			effectiveIntPmAmount,
			intPmRatio,
			pmPre,
			windowType,
			line1Level,
			line2Level,
			sustainLevelA,
			sustainLevelB,
		],
	);

	useEffect(() => {
		if (combinedCanvasRef.current) {
			drawScope(combinedCanvasRef.current, waveform.out1, waveform.out2);
		}
		if (line1CanvasRef.current) {
			drawSingleScope(line1CanvasRef.current, waveform.out1, "#2563eb");
		}
		if (line2CanvasRef.current) {
			drawSingleScope(line2CanvasRef.current, waveform.out2, "#ec4899");
		}
		if (phaseCanvasRef.current) {
			drawPhaseMap(phaseCanvasRef.current, waveform.phase);
		}
	}, [waveform]);

	const asidePanels: Record<AsidePanelTab, ReactNode> = {
		scope: (
			<ScopePanel
				oscilloscopeCanvasRef={oscilloscopeCanvasRef}
				effectivePitchHz={effectivePitchHz}
				scopeCycles={uiState.scopeCycles}
				setScopeCycles={uiState.setScopeCycles}
				scopeVerticalZoom={uiState.scopeVerticalZoom}
				setScopeVerticalZoom={uiState.setScopeVerticalZoom}
				scopeTriggerLevel={uiState.scopeTriggerLevel}
				setScopeTriggerLevel={uiState.setScopeTriggerLevel}
			/>
		),
		global: (
			<GlobalVoicePanel
				volume={volume}
				setVolume={setVolume}
				polyMode={polyMode}
				setPolyMode={setPolyMode}
				velocityTarget={velocityTarget}
				setVelocityTarget={setVelocityTarget}
				pitchBendRange={pitchBendRange}
				setPitchBendRange={setPitchBendRange}
				modWheelVibratoDepth={modWheelVibratoDepth}
				setModWheelVibratoDepth={setModWheelVibratoDepth}
			/>
		),
		phaseMod: (
			<PhaseModPanel
				phaseModEnabled={phaseModEnabled}
				setPhaseModEnabled={setPhaseModEnabled}
				intPmAmount={intPmAmount}
				setIntPmAmount={setIntPmAmount}
				intPmRatio={intPmRatio}
				setIntPmRatio={setIntPmRatio}
				pmPre={pmPre}
				setPmPre={setPmPre}
			/>
		),
		vibrato: (
			<VibratoPanel
				vibratoEnabled={vibratoEnabled}
				setVibratoEnabled={setVibratoEnabled}
				vibratoWave={vibratoWave}
				setVibratoWave={setVibratoWave}
				vibratoRate={vibratoRate}
				setVibratoRate={setVibratoRate}
				vibratoDepth={vibratoDepth}
				setVibratoDepth={setVibratoDepth}
				vibratoDelay={vibratoDelay}
				setVibratoDelay={setVibratoDelay}
			/>
		),
		portamento: (
			<PortamentoPanel
				portamentoEnabled={portamentoEnabled}
				setPortamentoEnabled={setPortamentoEnabled}
				portamentoMode={portamentoMode}
				setPortamentoMode={setPortamentoMode}
				portamentoRate={portamentoRate}
				setPortamentoRate={setPortamentoRate}
				portamentoTime={portamentoTime}
				setPortamentoTime={setPortamentoTime}
			/>
		),
		lfo: (
			<LfoPanel
				lfoEnabled={lfoEnabled}
				setLfoEnabled={setLfoEnabled}
				lfoWaveform={lfoWaveform}
				setLfoWaveform={setLfoWaveform}
				lfoRate={lfoRate}
				setLfoRate={setLfoRate}
				lfoDepth={lfoDepth}
				setLfoDepth={setLfoDepth}
				lfoOffset={lfoOffset}
				setLfoOffset={setLfoOffset}
				lfoTarget={lfoTarget}
				setLfoTarget={setLfoTarget}
			/>
		),
		filter: (
			<SynthFilterPanel
				filterEnabled={filterEnabled}
				setFilterEnabled={setFilterEnabled}
				filterType={filterType}
				setFilterType={setFilterType}
				filterCutoff={filterCutoff}
				setFilterCutoff={setFilterCutoff}
				filterResonance={filterResonance}
				setFilterResonance={setFilterResonance}
				filterEnvAmount={filterEnvAmount}
				setFilterEnvAmount={setFilterEnvAmount}
			/>
		),
		chorus: (
			<ChorusPanel
				enabled={chorusEnabled}
				setEnabled={setChorusEnabled}
				rate={chorusRate}
				setRate={setChorusRate}
				depth={chorusDepth}
				setDepth={setChorusDepth}
				mix={chorusMix}
				setMix={setChorusMix}
			/>
		),
		delay: (
			<DelayPanel
				enabled={delayEnabled}
				setEnabled={setDelayEnabled}
				time={delayTime}
				setTime={setDelayTime}
				feedback={delayFeedback}
				setFeedback={setDelayFeedback}
				mix={delayMix}
				setMix={setDelayMix}
			/>
		),
		reverb: (
			<ReverbPanel
				enabled={reverbEnabled}
				setEnabled={setReverbEnabled}
				size={reverbSize}
				setSize={setReverbSize}
				mix={reverbMix}
				setMix={setReverbMix}
			/>
		),
	};

	const line1DcoSetter =
		envOverrideHandlers?.onLine1DcoEnvChange ?? setLine1DcoEnv;
	const line1DcwSetter =
		envOverrideHandlers?.onLine1DcwEnvChange ?? setLine1DcwEnv;
	const line1DcaSetter =
		envOverrideHandlers?.onLine1DcaEnvChange ?? setLine1DcaEnv;
	const line2DcoSetter =
		envOverrideHandlers?.onLine2DcoEnvChange ?? setLine2DcoEnv;
	const line2DcwSetter =
		envOverrideHandlers?.onLine2DcwEnvChange ?? setLine2DcwEnv;
	const line2DcaSetter =
		envOverrideHandlers?.onLine2DcaEnvChange ?? setLine2DcaEnv;

	return (
		<SynthUiLayout
			frameClassName={frameClassName}
			frameStyle={frameStyle}
			headerProps={headerProps}
			headerExtra={headerExtra}
			lcdPrimaryText={lcdPrimaryText}
			lcdSecondaryText={lcdSecondaryText}
			lcdTransientReadout={lcdTransientReadout}
			asideTabs={DEFAULT_SYNTH_ASIDE_TABS}
			activeAsideTab={uiState.activeAsidePanel}
			onActiveAsideTabChange={uiState.setActiveAsidePanel}
			asidePanels={asidePanels}
			asideTabEnabledState={{
				phaseMod: phaseModEnabled,
				vibrato: vibratoEnabled,
				portamento: portamentoEnabled,
				lfo: lfoEnabled,
				filter: filterEnabled,
				chorus: chorusEnabled,
				delay: delayEnabled,
				reverb: reverbEnabled,
			}}
			lineSelect={lineSelect as LineSelect}
			onLineSelectChange={setLineSelect as (lineSelect: LineSelect) => void}
			modMode={modMode}
			onModModeChange={setModMode}
			singleCycleData={
				uiState.activePhaseLineTab === "line1" ? waveform.out1 : waveform.out2
			}
			phaseLinesClassName="flex-1 min-h-0 max-w-5xl max-h-164"
			onActivePhaseLineTabChange={uiState.setActivePhaseLineTab}
			line1={{
				warpAmount: warpAAmount,
				setWarpAmount: setWarpAAmount,
				algo: warpAAlgo,
				setAlgo: setWarpAAlgo,
				algo2: algo2A,
				setAlgo2: setAlgo2A,
				algoBlend: algoBlendA,
				setAlgoBlend: setAlgoBlendA,
				dcwComp: line1DcwComp,
				setDcwComp: setLine1DcwComp,
				level: line1Level,
				setLevel: setLine1Level,
				octave: line1Octave,
				setOctave: setLine1Octave,
				fineDetune: line1Detune,
				setFineDetune: setLine1Detune,
				dcoDepth: line1DcoDepth,
				setDcoDepth: setLine1DcoDepth,
				dcoEnv: line1DcoEnv,
				setDcoEnv: line1DcoSetter,
				dcwEnv: line1DcwEnv,
				setDcwEnv: line1DcwSetter,
				dcaEnv: line1DcaEnv,
				setDcaEnv: line1DcaSetter,
				keyFollow: line1DcwKeyFollow,
				setKeyFollow: setLine1DcwKeyFollow,
				waveform: waveform.out1,
			}}
			line2={{
				warpAmount: warpBAmount,
				setWarpAmount: setWarpBAmount,
				algo: warpBAlgo,
				setAlgo: setWarpBAlgo,
				algo2: algo2B,
				setAlgo2: setAlgo2B,
				algoBlend: algoBlendB,
				setAlgoBlend: setAlgoBlendB,
				dcwComp: line2DcwComp,
				setDcwComp: setLine2DcwComp,
				level: line2Level,
				setLevel: setLine2Level,
				octave: line2Octave,
				setOctave: setLine2Octave,
				fineDetune: line2Detune,
				setFineDetune: setLine2Detune,
				dcoDepth: line2DcoDepth,
				setDcoDepth: setLine2DcoDepth,
				dcoEnv: line2DcoEnv,
				setDcoEnv: line2DcoSetter,
				dcwEnv: line2DcwEnv,
				setDcwEnv: line2DcwSetter,
				dcaEnv: line2DcaEnv,
				setDcaEnv: line2DcaSetter,
				keyFollow: line2DcwKeyFollow,
				setKeyFollow: setLine2DcwKeyFollow,
				waveform: waveform.out2,
			}}
		/>
	);
}
