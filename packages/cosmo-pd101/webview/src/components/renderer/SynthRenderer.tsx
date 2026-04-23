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
					<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(191,189,48,0.07),transparent_18%),radial-gradient(circle_at_78%_18%,rgba(127,157,228,0.12),transparent_20%),linear-gradient(180deg,rgba(255,255,255,0.03),transparent_16%,transparent_84%,rgba(255,255,255,0.02))]" />
					<div className="pointer-events-none absolute inset-x-0 top-[5.8rem] bottom-10 bg-[repeating-linear-gradient(90deg,rgba(255,255,255,0.018)_0px,rgba(255,255,255,0.018)_1px,transparent_1px,transparent_32px)] opacity-45" />
					<SynthHeader {...headerProps} />
					{headerExtra}
					<div className="relative z-10 px-1 grid flex-1 min-h-0 min-w-0 w-full gap-4 grid-cols-[320px_minmax(0,1fr)] overflow-hidden">
						<aside className="overflow-y-auto min-h-0 rounded-[1.15rem] border border-cz-border/80 bg-[linear-gradient(180deg,rgba(27,27,28,0.95),rgba(15,15,16,0.98))] px-0 pb-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.03),0_18px_34px_rgba(0,0,0,0.24)] [scrollbar-gutter:stable]">
							<div className="pointer-events-none sticky top-0 z-0 h-10 bg-[repeating-linear-gradient(90deg,rgba(191,189,48,0.06)_0px,rgba(191,189,48,0.06)_1px,transparent_1px,transparent_18px)] opacity-60" />
							<div className="px-4 -mt-1 mx-auto">
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
							<div className="ml-auto flex w-full max-w-5xl min-h-0 flex-1 flex-col gap-3 rounded-[1.2rem] border border-cz-border/80 bg-[linear-gradient(180deg,rgba(36,37,39,0.94),rgba(25,25,27,0.98))] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_22px_40px_rgba(0,0,0,0.24)]">
								<div className="pointer-events-none absolute inset-x-4 top-0 h-12 rounded-t-[1.2rem] bg-[repeating-linear-gradient(90deg,rgba(127,157,228,0.06)_0px,rgba(127,157,228,0.06)_1px,transparent_1px,transparent_24px)] opacity-70" />
								<div className="relative shrink-0 rounded-md border border-cz-border bg-[linear-gradient(180deg,rgba(25,25,25,0.92),rgba(37,37,39,0.98))] px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
									<div className="flex flex-wrap items-end justify-end gap-x-4 gap-y-2">
										<LineSelectControl />
										<ModModeControl />
										<SynthSingleCycleDisplay />
										<div className="flex items-end gap-2 border-l border-cz-border pl-3">
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

								<div className="relative flex-1 min-h-0 min-w-0 overflow-hidden rounded-[1rem] border border-cz-border/75 bg-[linear-gradient(180deg,rgba(49,49,49,0.28),rgba(22,22,24,0.16))] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
									<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(127,157,228,0.12),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.025),transparent_14%,transparent_86%,rgba(255,255,255,0.02))]" />
									<PhaseLinesSection
										className="h-full min-h-0 max-h-164"
										envOverrideHandlers={envOverrideHandlers}
									/>
									<AnimatePresence initial={false}>
										{mainPanelMode === "fx" ? (
											<motion.div
												key="fx-drawer"
												initial={{ opacity: 0, y: -14, scaleY: 0.92 }}
												animate={{ opacity: 1, y: 0, scaleY: 1 }}
												exit={{ opacity: 0, y: -10, scaleY: 0.94 }}
												transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
												style={{ transformOrigin: "top center" }}
												className="absolute inset-x-0 top-0 z-10 overflow-hidden px-2 pt-2"
											>
												<div className="relative rounded-lg border border-cz-border bg-[#171716] p-3 shadow-[0_18px_40px_rgba(0,0,0,0.32)]">
													<div className="pointer-events-none absolute inset-0 rounded-lg bg-[linear-gradient(180deg,rgba(255,255,255,0.02),transparent_18%,transparent_82%,rgba(255,255,255,0.02))]" />
													<div className="pointer-events-none absolute inset-x-0 top-0 h-14 rounded-t-lg bg-[repeating-linear-gradient(90deg,rgba(127,157,228,0.05)_0px,rgba(127,157,228,0.05)_1px,transparent_1px,transparent_28px)] opacity-60" />
													<div className="relative">
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
					<div className="relative z-20 mx-1 mt-1 flex h-8 items-center gap-3 rounded-sm border border-cz-border/80 bg-[linear-gradient(180deg,rgba(17,17,16,0.97),rgba(28,28,27,0.95))] px-3 font-mono text-[0.62rem] uppercase tracking-[0.22em] text-cz-cream/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
						<span className="text-cz-light-blue/80">Info</span>
						<span className="min-w-0 flex-1 truncate">{infoText}</span>
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
