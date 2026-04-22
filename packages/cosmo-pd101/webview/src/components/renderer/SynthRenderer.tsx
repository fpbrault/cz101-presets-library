import type { CSSProperties, ReactNode, RefObject } from "react";
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

						<main className="flex flex-col gap-4 p-1 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden">
							<div className="mb-3 shrink-0 flex flex-wrap items-end gap-x-6 gap-y-2 border-b border-cz-cream pb-3">
								<LineSelectControl />
								<ModModeControl />
								<SynthSingleCycleDisplay />
							</div>

							<PhaseLinesSection
								className="flex-1 min-h-0 max-w-5xl max-h-164"
								envOverrideHandlers={envOverrideHandlers}
							/>
						</main>
					</div>
				</div>
			</SynthParamControllerProvider>
		</ModMatrixProvider>
	);
}
