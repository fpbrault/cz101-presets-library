import { AnimatePresence, motion } from "motion/react";
import {
	type CSSProperties,
	type ReactNode,
	type RefObject,
	useState,
} from "react";
import LineSelectControl from "@/components/controls/LineSelectControl";
import ModModeControl from "@/components/controls/ModModeControl";
import type { EnvOverrideHandlers } from "@/components/editor/PhaseLinesSection";
import PhaseLinesSection from "@/components/editor/PhaseLinesSection";
import { SynthSingleCycleDisplay } from "@/components/editor/SingleCycleDisplay";
import type { AsidePanelTab } from "@/components/layout/AsidePanelSwitcher";
import AsidePanelSwitcher from "@/components/layout/AsidePanelSwitcher";
import SynthLcdDisplay from "@/components/layout/SynthLcdDisplay";
import ScopePanel from "@/components/panels/analysis/ScopePanel";
import ChorusPanel from "@/components/panels/fx/ChorusPanel";
import DelayPanel from "@/components/panels/fx/DelayPanel";
import FxConsoleDrawer from "@/components/panels/fx/FxConsoleDrawer";
import ReverbPanel from "@/components/panels/fx/ReverbPanel";
import SynthFilterPanel from "@/components/panels/fx/SynthFilterPanel";
import GlobalVoicePanel from "@/components/panels/voice/GlobalVoicePanel";
import LfoPanel from "@/components/panels/voice/LfoPanel";
import PhaseModPanel from "@/components/panels/voice/PhaseModPanel";
import PortamentoPanel from "@/components/panels/voice/PortamentoPanel";
import VibratoPanel from "@/components/panels/voice/VibratoPanel";
import SynthHeader, {
	type SynthHeaderProps,
} from "@/components/preset/SynthHeader";
import CzButton from "@/components/primitives/CzButton";
import { ModMatrixProvider } from "@/context/ModMatrixContext";
import { SynthParamControllerProvider } from "@/features/synth/SynthParamController";
import type { UseSynthStateResult } from "@/features/synth/useSynthState";
import { HoverInfoProvider, useHoverInfo } from "../layout/HoverInfo";
import MiniKeyboardOverlay from "../layout/MiniKeyboardOverlay";

type SynthRendererProps = {
	synthState: UseSynthStateResult;
	headerProps: SynthHeaderProps;
	frameClassName: string;
	frameStyle?: CSSProperties;
	headerExtra?: ReactNode;
	bottomBarExtra?: ReactNode;
	lcdPrimaryText: string;
	lcdSecondaryText: string;
	lcdTransientReadout?: {
		label: string;
		value: string;
	} | null;
	effectivePitchHz: number;
	analyserNodeRef: RefObject<AnalyserNode | null>;
	audioCtxRef: RefObject<AudioContext | null>;
	subscribeScopeFrames?: (
		onFrame: (frame: {
			samples: Float32Array;
			sampleRate: number;
			hz: number;
		}) => void,
	) => () => void;
	activeAsidePanel: AsidePanelTab;
	onAsidePanelChange: (tab: AsidePanelTab) => void;
	envOverrideHandlers?: EnvOverrideHandlers;
	onControlReadout?: (key: string, value: string | number | boolean) => void;
	miniKeyboard?: {
		activeNotes: number[];
		onNoteOn: (note: number, velocity?: number) => void;
		onNoteOff: (note: number) => void;
	};
};

type MainPanelMode = "phase" | "fx";

export default function SynthRenderer({
	synthState,
	headerProps,
	frameClassName,
	frameStyle,
	headerExtra,
	bottomBarExtra,
	lcdPrimaryText,
	lcdSecondaryText,
	lcdTransientReadout = null,
	effectivePitchHz,
	analyserNodeRef,
	audioCtxRef,
	subscribeScopeFrames,
	activeAsidePanel,
	onAsidePanelChange,
	envOverrideHandlers,
	onControlReadout,
	miniKeyboard,
}: SynthRendererProps) {
	return (
		<HoverInfoProvider>
			<SynthRendererContent
				synthState={synthState}
				headerProps={headerProps}
				frameClassName={frameClassName}
				frameStyle={frameStyle}
				headerExtra={headerExtra}
				bottomBarExtra={bottomBarExtra}
				lcdPrimaryText={lcdPrimaryText}
				lcdSecondaryText={lcdSecondaryText}
				lcdTransientReadout={lcdTransientReadout}
				effectivePitchHz={effectivePitchHz}
				analyserNodeRef={analyserNodeRef}
				audioCtxRef={audioCtxRef}
				subscribeScopeFrames={subscribeScopeFrames}
				activeAsidePanel={activeAsidePanel}
				onAsidePanelChange={onAsidePanelChange}
				envOverrideHandlers={envOverrideHandlers}
				onControlReadout={onControlReadout}
				miniKeyboard={miniKeyboard}
			/>
		</HoverInfoProvider>
	);
}

function SynthRendererContent({
	synthState,
	headerProps,
	frameClassName,
	frameStyle,
	headerExtra,
	bottomBarExtra,
	lcdPrimaryText,
	lcdSecondaryText,
	lcdTransientReadout = null,
	effectivePitchHz,
	analyserNodeRef,
	audioCtxRef,
	subscribeScopeFrames,
	activeAsidePanel,
	onAsidePanelChange,
	envOverrideHandlers,
	onControlReadout,
	miniKeyboard,
}: SynthRendererProps) {
	const { modMatrix, setModMatrix } = synthState;
	const [mainPanelMode, setMainPanelMode] = useState<MainPanelMode>("phase");
	const [keyboardVisible, setKeyboardVisible] = useState(true);
	const { hoverInfo } = useHoverInfo();
	const infoText = hoverInfo
		? hoverInfo
		: lcdTransientReadout
			? `${lcdTransientReadout.label}: ${lcdTransientReadout.value}`
			: "Hover any control for context.";

	return (
		<ModMatrixProvider modMatrix={modMatrix} setModMatrix={setModMatrix}>
			<SynthParamControllerProvider
				synthState={synthState}
				onControlReadout={onControlReadout}
			>
				<div className={`${frameClassName} relative`} style={frameStyle}>
					<div className="pointer-events-none absolute inset-0" />
					<div className="pointer-events-none absolute inset-x-0 top-[5.8rem] bottom-10" />
					<SynthHeader {...headerProps} />
					{headerExtra}
					<div className="relative z-10 px-1 grid flex-1 min-h-0 min-w-0 w-full gap-2 xl:gap-3 grid-cols-[250px_minmax(0,1fr)] xl:grid-cols-[280px_minmax(0,1fr)] overflow-hidden">
						<aside className="overflow-y-auto min-h-0 rounded-[1.15rem] border border-cz-border/80 bg-cz-inset px-0 pb-2 shadow-lg [scrollbar-gutter:stable]">
					
							<div className="px-4 mt-4 mx-auto">
								<SynthLcdDisplay
									primaryText={lcdPrimaryText}
									secondaryText={lcdSecondaryText}
									transientReadout={lcdTransientReadout ?? null}
								/>
							</div>

							<AsidePanelSwitcher
								activeTab={activeAsidePanel}
								onTabChange={onAsidePanelChange}
							>
								<GlobalVoicePanel />
								<PortamentoPanel />
								<PhaseModPanel />
								<VibratoPanel />
								<LfoPanel />
								<ScopePanel
									analyserNodeRef={analyserNodeRef}
									audioCtxRef={audioCtxRef}
									effectivePitchHz={effectivePitchHz}
									subscribeScopeFrames={subscribeScopeFrames}
								/>
								<SynthFilterPanel />
								<ChorusPanel />
								<DelayPanel />
								<ReverbPanel />
							</AsidePanelSwitcher>
						</aside>

						<main className="flex min-h-0 min-w-0 overflow-y-auto overflow-x-hidden">
							<div className="flex w-full max-w-none min-h-0 flex-1 flex-col gap-2 rounded-[1.2rem] border border-cz-border/80 bg-cz-surface p-2 xl:p-3 2xl:mx-auto 2xl:max-w-5xl shadow-xl">
								<div className="pointer-events-none absolute inset-x-4 top-0 h-12 rounded-t-[1.2rem] opacity-70" />
								<div className="relative shrink-0 rounded-md border border-cz-border bg-cz-body px-2 py-2 xl:px-3 shadow-inner">
									<div className="flex flex-wrap items-end justify-end gap-x-2 gap-y-2 xl:gap-x-4">
										<LineSelectControl />
										<ModModeControl />
										<SynthSingleCycleDisplay />
										<div className="flex items-end gap-2 border-l border-cz-border pl-2 xl:pl-3">
											<CzButton
												active={mainPanelMode === "phase"}
												onClick={() => setMainPanelMode("phase")}
												className="[&_button]:w-18"
											>
												Main
											</CzButton>
											<CzButton
												active={mainPanelMode === "fx"}
												onClick={() =>
													setMainPanelMode((current) =>
														current === "fx" ? "phase" : "fx",
													)
												}
												className="[&_button]:w-18"
											>
												FX
											</CzButton>
										</div>
									</div>
								</div>

								<div className="relative flex-1 min-h-0 min-w-0 overflow-hidden rounded-2xl border border-cz-border/75 bg-cz-panel/30 p-2 shadow-inner">
									<div className="pointer-events-none absolute inset-0" />
									<PhaseLinesSection
										className="h-full min-h-0 max-h-164"
										envOverrideHandlers={envOverrideHandlers}
									/>
									<AnimatePresence initial={false}>
										{mainPanelMode === "fx" ? (
											<motion.div
												key="fx-drawer"
												initial={{ y: "-100%" }}
												animate={{ y: 0 }}
												exit={{ y: "-100%" }}
												transition={{
													type: "spring",
													stiffness: 220,
													damping: 30,
													mass: 1,
												}}
												style={{ transformOrigin: "top center" }}
												className="absolute inset-0 z-10 overflow-hidden p-2"
											>
												<div className="relative flex h-full min-h-0 flex-col rounded-lg border border-cz-border bg-cz-body p-3 shadow-xl">
													<div className="pointer-events-none absolute inset-0 rounded-lg bg-white/5" />
													<div className="pointer-events-none absolute inset-x-0 top-0 h-14 rounded-t-lg opacity-60" />
													<div className="relative min-h-0 flex-1">
														<FxConsoleDrawer />
													</div>
												</div>
											</motion.div>
										) : null}
									</AnimatePresence>
								</div>
							</div>
						</main>
					</div>
					{miniKeyboard ? (
						<MiniKeyboardOverlay
							activeNotes={miniKeyboard.activeNotes}
							visible={keyboardVisible}
							onNoteOn={miniKeyboard.onNoteOn}
							onNoteOff={miniKeyboard.onNoteOff}
						/>
					) : null}
					<div className="relative z-20 mt-1 flex min-h-8 flex-wrap items-center gap-x-3 gap-y-1 rounded-t-sm border border-cz-border/80 bg-cz-body px-3 py-1 font-mono text-[0.62rem] uppercase tracking-[0.22em] text-cz-cream/80 shadow-inner">
						<span className="text-cz-light-blue/80">Info</span>
						<span className="min-w-0 flex-1 truncate">{infoText}</span>
						{bottomBarExtra ? (
							<div className="flex items-center gap-2 text-[0.54rem] tracking-[0.18em]">
								{bottomBarExtra}
							</div>
						) : null}
						{miniKeyboard ? (
							<button
								type="button"
								onClick={() => setKeyboardVisible((current) => !current)}
								className={`rounded-sm border px-2 py-1 text-[0.56rem] uppercase tracking-[0.24em] transition-colors ${
									keyboardVisible
										? "border-cz-gold bg-cz-gold/10 text-cz-gold"
										: "border-cz-border bg-black/10 text-cz-cream/70 hover:text-cz-cream"
								}`}
							>
								{keyboardVisible ? "Hide Keys" : "Show Keys"}
							</button>
						) : null}
					</div>
				</div>
			</SynthParamControllerProvider>
		</ModMatrixProvider>
	);
}
