import { memo } from "react";
import { ControlKnob } from "@/components/controls/ControlKnob";
import type { ModRoute, ModSource } from "@/lib/synth/bindings/synth";

/** Visible label + colour for each modulation source. */
export const MOD_SOURCE_META: Record<
	ModSource,
	{ label: string; shortLabel: string; colorClass: string; bgClass: string }
> = {
	lfo1: {
		label: "LFO 1",
		shortLabel: "LFO1",
		colorClass: "text-cz-light-blue",
		bgClass: "bg-cz-light-blue/20 border-cz-light-blue/40",
	},
	lfo2: {
		label: "LFO 2",
		shortLabel: "LFO2",
		colorClass: "text-cz-light-blue/60",
		bgClass: "bg-cz-light-blue/10 border-cz-light-blue/20",
	},
	velocity: {
		label: "Velocity",
		shortLabel: "VEL",
		colorClass: "text-emerald-400",
		bgClass: "bg-emerald-500/20 border-emerald-500/40",
	},
	modWheel: {
		label: "Mod Wheel",
		shortLabel: "MW",
		colorClass: "text-violet-400",
		bgClass: "bg-violet-500/20 border-violet-500/40",
	},
	aftertouch: {
		label: "Aftertouch",
		shortLabel: "AT",
		colorClass: "text-amber-400",
		bgClass: "bg-amber-500/20 border-amber-500/40",
	},
};

interface ModRouteRowProps {
	route: ModRoute;
	/** Human-readable destination label. Falls back to raw destination id. */
	destinationLabel?: string;
	/** Whether to show the destination label (hide in per-destination menus). */
	showDestination?: boolean;
	onToggleEnabled: () => void;
	onRemove: () => void;
	onAmountChange: (amount: number) => void;
}

const ModRouteRow = memo(function ModRouteRow({
	route,
	destinationLabel,
	showDestination = false,
	onToggleEnabled,
	onRemove,
	onAmountChange,
}: ModRouteRowProps) {
	const meta = MOD_SOURCE_META[route.source];

	return (
		<div
			className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 transition-colors ${
				route.enabled
					? "border-cz-border/60 bg-cz-inset/80"
					: "border-cz-border/30 bg-cz-inset/30 opacity-60"
			}`}
		>
			{/* Source badge */}
			<span
				className={`shrink-0 rounded border px-1 py-0.5 font-mono text-[0.52rem] font-bold uppercase tracking-[0.15em] ${meta.colorClass} ${meta.bgClass}`}
			>
				{meta.shortLabel}
			</span>

			{/* Destination (optional) */}
			{showDestination && (
				<>
					<span className="text-[0.55rem] text-cz-cream-dim/50">→</span>
					<span
						className="min-w-0 flex-1 truncate font-mono text-[0.55rem] uppercase tracking-[0.1em] text-cz-cream-dim"
						title={destinationLabel}
					>
						{destinationLabel ?? route.destination}
					</span>
				</>
			)}

			{/* Amount knob */}
			<div className="shrink-0">
				<ControlKnob
					value={route.amount}
					onChange={onAmountChange}
					min={-1}
					max={1}
					bipolar
					size={32}
					color="#7f9de4"
					label="Amount"
					valueFormatter={(v) => v.toFixed(2)}
					valueVisibility="hover"
				/>
			</div>

			{/* Enabled toggle */}
			<button
				type="button"
				onClick={onToggleEnabled}
				aria-label={route.enabled ? "Disable route" : "Enable route"}
				className={`shrink-0 rounded border px-1.5 py-0.5 font-mono text-[0.5rem] font-bold uppercase tracking-[0.12em] transition-colors ${
					route.enabled
						? "border-cz-gold/50 bg-cz-gold/10 text-cz-gold"
						: "border-cz-border bg-black/10 text-cz-cream-dim hover:text-cz-cream"
				}`}
			>
				{route.enabled ? "On" : "Off"}
			</button>

			{/* Remove */}
			<button
				type="button"
				onClick={onRemove}
				aria-label="Remove route"
				className="shrink-0 flex h-4 w-4 items-center justify-center rounded text-[0.6rem] text-cz-cream-dim/60 transition-colors hover:bg-red-500/20 hover:text-red-400"
			>
				✕
			</button>
		</div>
	);
});

export default ModRouteRow;
