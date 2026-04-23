import { AnimatePresence, motion } from "motion/react";
import { type CSSProperties, type ReactNode, type RefObject, useState } from "react";
import LineSelectControl from "@/components/controls/LineSelectControl";
import ModModeControl from "@/components/controls/ModModeControl";
import type { EnvOverrideHandlers } from "@/components/editor/PhaseLinesSection";
import PhaseLinesSection from "@/components/editor/PhaseLinesSection";
import { SynthSingleCycleDisplay } from "@/components/editor/SingleCycleDisplay";
import type { AsidePanelTab } from "@/components/layout/AsidePanelSwitcher";
import AsidePanelSwitcher from "@/components/layout/AsidePanelSwitcher";
import { HoverInfoProvider, useHoverInfo } from "../layout/HoverInfo";
import MiniKeyboardOverlay from "../layout/MiniKeyboardOverlay";
import SynthLcdDisplay from "@/components/layout/SynthLcdDisplay";
import CzButton from "@/components/primitives/CzButton";
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
import { ModMatrixProvider } from "@/context/ModMatrixContext";
import { SynthParamControllerProvider } from "@/features/synth/SynthParamController";
import type { UseSynthStateResult } from "@/features/synth/useSynthState";

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
	const [keyboardVisible, setKeyboardVisible] = useState(false);
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
					<SynthHeader {...headerProps} />
					{headerExtra}
					<div className="px-1 grid flex-1 min-h-0 min-w-0 w-full gap-4 grid-cols-[320px_minmax(0,1fr)] overflow-hidden">
						<aside className="overflow-y-auto min-h-0 space-y-0 [scrollbar-gutter:stable]">
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

						<main className="flex flex-col gap-3 p-1 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden">
							<div className="ml-auto flex w-full max-w-5xl min-h-0 flex-1 flex-col gap-3">
								<div className="shrink-0 rounded-md border border-cz-border bg-cz-body/88 px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
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

								<div className="relative flex-1 min-h-0 min-w-0">
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
							onToggle={() => setKeyboardVisible((current) => !current)}
							onNoteOn={miniKeyboard.onNoteOn}
							onNoteOff={miniKeyboard.onNoteOff}
						/>
					) : null}
					<div className="mx-1 mt-1 flex h-7 items-center rounded-sm border border-cz-border/80 bg-[linear-gradient(180deg,rgba(17,17,16,0.96),rgba(28,28,27,0.94))] px-3 font-mono text-[0.62rem] uppercase tracking-[0.22em] text-cz-cream/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
						<span className="mr-3 text-cz-light-blue/80">Info</span>
						<span className="truncate">{infoText}</span>
					</div>
				</div>
			</SynthParamControllerProvider>
		</ModMatrixProvider>
	);
}
