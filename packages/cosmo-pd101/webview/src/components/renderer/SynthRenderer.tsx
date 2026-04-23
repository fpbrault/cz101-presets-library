import { AnimatePresence, motion } from "motion/react";
import { type CSSProperties, type ReactNode, type RefObject, useState } from "react";
import LineSelectControl from "@/components/controls/LineSelectControl";
import ModModeControl from "@/components/controls/ModModeControl";
import type { EnvOverrideHandlers } from "@/components/editor/PhaseLinesSection";
import PhaseLinesSection from "@/components/editor/PhaseLinesSection";
import { SynthSingleCycleDisplay } from "@/components/editor/SingleCycleDisplay";
import type { AsidePanelTab } from "@/components/layout/AsidePanelSwitcher";
import AsidePanelSwitcher from "@/components/layout/AsidePanelSwitcher";
import SynthLcdDisplay from "@/components/layout/SynthLcdDisplay";
import CzButton from "@/components/primitives/CzButton";
import ScopePanel from "@/components/panels/analysis/ScopePanel";
import ChorusPanel from "@/components/panels/fx/ChorusPanel";
import DelayPanel from "@/components/panels/fx/DelayPanel";
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
}: SynthRendererProps) {
	const { modMatrix, setModMatrix } = synthState;
	const [mainPanelMode, setMainPanelMode] = useState<MainPanelMode>("phase");

	return (
		<ModMatrixProvider modMatrix={modMatrix} setModMatrix={setModMatrix}>
			<SynthParamControllerProvider
				synthState={synthState}
				onControlReadout={onControlReadout}
			>
				<div className={frameClassName} style={frameStyle}>
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
												Phase
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
								<AnimatePresence>
									{mainPanelMode === "fx" ? (
										<motion.div
											key="fx-drawer"
											initial={{ opacity: 0, y: 18 }}
											animate={{ opacity: 1, y: 0 }}
											exit={{ opacity: 0, y: 12 }}
											transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
											className="absolute inset-0 z-10 flex flex-col rounded-lg border border-cz-border bg-cz-body/96 p-3 shadow-[0_18px_40px_rgba(0,0,0,0.42)] backdrop-blur-[2px]"
										>
											<div className="mb-3 flex items-center justify-between border-b border-cz-border pb-2">
												<div>
													<div className="text-4xs font-mono uppercase tracking-[0.28em] text-cz-light-blue">
														Main Panel
													</div>
													<div className="text-sm font-mono font-bold uppercase tracking-[0.18em] text-cz-cream">
														Effects
													</div>
												</div>
												<button
													type="button"
													onClick={() => setMainPanelMode("phase")}
													className="rounded border border-cz-border px-2 py-1 text-4xs font-mono uppercase tracking-[0.2em] text-cz-cream-dim transition-colors hover:text-cz-cream"
												>
													Close
												</button>
											</div>
											<div className="grid min-h-0 flex-1 gap-3 overflow-y-auto pr-1 xl:grid-cols-2">
												<SynthFilterPanel />
												<ChorusPanel />
												<DelayPanel />
												<ReverbPanel />
											</div>
										</motion.div>
									) : null}
								</AnimatePresence>
							</div>
							</div>
						</main>
					</div>
				</div>
			</SynthParamControllerProvider>
		</ModMatrixProvider>
	);
}
