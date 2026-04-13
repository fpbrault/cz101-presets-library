import ControlKnob from "@/components/ControlKnob";
import CollapsibleCard from "@/components/ui/CollapsibleCard";
import type { RefObject } from "react";

type ScopePanelProps = {
	oscilloscopeCanvasRef: RefObject<HTMLCanvasElement | null>;
	effectivePitchHz: number;
	scopeCycles: number;
	setScopeCycles: (v: number) => void;
	scopeVerticalZoom: number;
	setScopeVerticalZoom: (v: number) => void;
	scopeTriggerLevel: number;
	setScopeTriggerLevel: (v: number) => void;
	open?: boolean;
	onToggle?: React.MouseEventHandler<HTMLDetailsElement>;
};

export default function ScopePanel({
	oscilloscopeCanvasRef,
	effectivePitchHz,
	scopeCycles,
	setScopeCycles,
	scopeVerticalZoom,
	setScopeVerticalZoom,
	scopeTriggerLevel,
	setScopeTriggerLevel,
	open = true,
	onToggle,
}: ScopePanelProps) {
	return (
		<CollapsibleCard
			variant="panel-slanted"
			open={open}
			onToggle={onToggle}
			titleClassName="pr-3"
			title="Scope"
		>
			<div className="space-y-2">
				<div className="relative overflow-hidden rounded-lg border border-cz-border bg-cz-lcd-bg">
					<div className="absolute left-2 top-1 text-[8px] font-mono text-cz-lcd-fg/60">
						CH1
					</div>
					<div className="absolute right-3 top-3 text-[10px] font-mono uppercase tracking-[0.2em] text-cz-lcd-fg/60">
						{effectivePitchHz.toFixed(1)} Hz
					</div>
					<canvas
						ref={oscilloscopeCanvasRef as RefObject<HTMLCanvasElement>}
						width={900}
						height={220}
						className="h-36 w-full"
						style={{ imageRendering: "pixelated" }}
					/>
				</div>
				<div className="flex justify-center gap-2">
					<ControlKnob
						value={scopeCycles}
						onChange={setScopeCycles}
						min={0.5}
						max={8}
						size={48}
						color="#3dff3d"
						label="Cycles"
						valueFormatter={(value) => value.toFixed(1)}
					/>
					<ControlKnob
						value={scopeVerticalZoom}
						onChange={setScopeVerticalZoom}
						min={0.25}
						max={4}
						size={48}
						color="#9cb937"
						label="Zoom"
						valueFormatter={(value) => `${value.toFixed(1)}x`}
					/>
					<ControlKnob
						value={scopeTriggerLevel}
						onChange={(value) => setScopeTriggerLevel(Math.round(value))}
						min={0}
						max={255}
						size={48}
						color="#7f9de4"
						label="Trig"
						valueFormatter={(value) => `${Math.round(value)}`}
					/>
				</div>
			</div>
		</CollapsibleCard>
	);
}
