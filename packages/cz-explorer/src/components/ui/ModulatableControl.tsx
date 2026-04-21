import { memo, type ReactNode, useCallback, useMemo, useState } from "react";
import { useModMatrix } from "@/context/ModMatrixContext";
import type {
	ModDestination,
	ModRoute,
	ModSource,
} from "@/lib/synth/bindings/synth";

const MOD_SOURCES: { label: string; value: ModSource }[] = [
	{ label: "LFO 1", value: "lfo1" },
	{ label: "LFO 2 (stub)", value: "lfo2" },
	{ label: "Velocity", value: "velocity" },
	{ label: "Mod Wheel", value: "modWheel" },
	{ label: "Aftertouch", value: "aftertouch" },
];

interface ModulatableControlProps {
	/** The mod-matrix destination this control maps to. */
	destinationId: ModDestination;
	/** The label shown next to the mod indicator. */
	label?: string;
	children: ReactNode;
}

/**
 * Wraps any synth control (knob, slider) with a modulation indicator badge
 * and an affordance to add/edit/remove mod-matrix routes for the control's
 * destination.
 */
const ModulatableControl = memo(function ModulatableControl({
	destinationId,
	label,
	children,
}: ModulatableControlProps) {
	const { modMatrix, setModMatrix } = useModMatrix();
	const [popoverOpen, setPopoverOpen] = useState(false);

	const activeRoutes = useMemo(
		() => modMatrix.routes.filter((r) => r.destination === destinationId),
		[modMatrix.routes, destinationId],
	);

	const handleAddRoute = useCallback(
		(source: ModSource) => {
			const newRoute: ModRoute = {
				source,
				destination: destinationId,
				amount: 0.5,
				enabled: true,
			};
			setModMatrix({ routes: [...modMatrix.routes, newRoute] });
		},
		[modMatrix.routes, destinationId, setModMatrix],
	);

	const handleRemoveRoute = useCallback(
		(index: number) => {
			const globalIndex = modMatrix.routes.findIndex(
				(r) =>
					r.destination === destinationId &&
					modMatrix.routes
						.filter((r2) => r2.destination === destinationId)
						.indexOf(r) === index,
			);
			if (globalIndex < 0) return;
			const next = [...modMatrix.routes];
			next.splice(globalIndex, 1);
			setModMatrix({ routes: next });
		},
		[modMatrix.routes, destinationId, setModMatrix],
	);

	const handleAmountChange = useCallback(
		(index: number, amount: number) => {
			let destIdx = -1;
			const next = modMatrix.routes.map((r) => {
				if (r.destination === destinationId) {
					destIdx++;
					if (destIdx === index) return { ...r, amount };
				}
				return r;
			});
			setModMatrix({ routes: next });
		},
		[modMatrix.routes, destinationId, setModMatrix],
	);

	const handleToggleEnabled = useCallback(
		(index: number) => {
			let destIdx = -1;
			const next = modMatrix.routes.map((r) => {
				if (r.destination === destinationId) {
					destIdx++;
					if (destIdx === index) return { ...r, enabled: !r.enabled };
				}
				return r;
			});
			setModMatrix({ routes: next });
		},
		[modMatrix.routes, destinationId, setModMatrix],
	);

	const hasActiveRoutes = activeRoutes.length > 0;

	return (
		<div className="relative inline-block">
			{children}
			{/* Modulation indicator badge */}
			<button
				type="button"
				aria-label={`Modulation for ${label ?? destinationId}`}
				onClick={() => setPopoverOpen((v) => !v)}
				className={[
					"absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full border text-4xs flex items-center justify-center transition-colors focus:outline-none z-10",
					hasActiveRoutes
						? "bg-cz-light-blue border-cz-light-blue text-white"
						: "bg-cz-surface border-cz-border text-cz-cream hover:border-cz-light-blue",
				].join(" ")}
			>
				{hasActiveRoutes ? activeRoutes.length : "+"}
			</button>

			{/* Popover panel */}
			{popoverOpen && (
				<div className="absolute top-5 right-0 z-50 min-w-50 bg-cz-surface border border-cz-border p-2 rounded shadow-lg space-y-2">
					<div className="text-4xs uppercase tracking-[0.18em] text-cz-cream mb-1">
						{label ?? destinationId}
					</div>

					{/* Existing routes */}
					{activeRoutes.map((route, idx) => (
						<div
							key={`${route.source}-${route.destination}-${route.amount}`}
							className="space-y-1"
						>
							<div className="flex items-center justify-between gap-1">
								<span className="text-4xs text-cz-cream">
									{MOD_SOURCES.find((s) => s.value === route.source)?.label ??
										route.source}
								</span>
								<div className="flex items-center gap-1">
									<input
										type="checkbox"
										checked={route.enabled}
										onChange={() => handleToggleEnabled(idx)}
										className="checkbox checkbox-xs"
									/>
									<button
										type="button"
										onClick={() => handleRemoveRoute(idx)}
										className="text-4xs text-red-400 hover:text-red-300 px-1"
									>
										✕
									</button>
								</div>
							</div>
							<div className="flex items-center gap-1">
								<input
									type="range"
									min={-1}
									max={1}
									step={0.01}
									value={route.amount}
									onChange={(e) =>
										handleAmountChange(idx, Number(e.target.value))
									}
									className="range range-xs flex-1"
								/>
								<span className="text-4xs text-cz-cream w-8 text-right">
									{route.amount.toFixed(2)}
								</span>
							</div>
						</div>
					))}

					{/* Add new route */}
					<div className="pt-1 border-t border-cz-border">
						<div className="text-4xs uppercase tracking-[0.18em] text-cz-cream/70 mb-1">
							Add Source
						</div>
						<div className="flex flex-wrap gap-1">
							{MOD_SOURCES.map((src) => (
								<button
									key={src.value}
									type="button"
									onClick={() => handleAddRoute(src.value)}
									className="px-1.5 py-0.5 text-4xs uppercase tracking-[0.12em] border border-cz-border bg-cz-inset text-cz-cream hover:border-cz-light-blue hover:text-white transition-colors"
								>
									{src.label}
								</button>
							))}
						</div>
					</div>

					<button
						type="button"
						onClick={() => setPopoverOpen(false)}
						className="w-full text-4xs uppercase tracking-[0.18em] text-cz-cream/70 hover:text-cz-cream pt-1"
					>
						Close
					</button>
				</div>
			)}
		</div>
	);
});

export default ModulatableControl;
