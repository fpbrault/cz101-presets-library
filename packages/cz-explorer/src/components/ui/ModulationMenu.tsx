import type { ModRoute, ModSource } from "@/lib/synth/bindings/synth";

const MOD_SOURCES: { label: string; value: ModSource }[] = [
	{ label: "LFO 1", value: "lfo1" },
	{ label: "LFO 2 (stub)", value: "lfo2" },
	{ label: "Velocity", value: "velocity" },
	{ label: "Mod Wheel", value: "modWheel" },
	{ label: "Aftertouch", value: "aftertouch" },
];

interface ModulationMenuProps {
	title: string;
	routes: ModRoute[];
	onToggleEnabled: (index: number) => void;
	onRemoveRoute: (index: number) => void;
	onAmountChange: (index: number, amount: number) => void;
	onAddRoute: (source: ModSource) => void;
	onClose: () => void;
}

export default function ModulationMenu({
	title,
	routes,
	onToggleEnabled,
	onRemoveRoute,
	onAmountChange,
	onAddRoute,
	onClose,
}: ModulationMenuProps) {
	return (
		<div className="absolute top-5 right-0 z-50 min-w-50 bg-cz-surface border border-cz-border p-2 rounded shadow-lg space-y-2">
			<div className="text-4xs uppercase tracking-[0.18em] text-cz-cream mb-1">
				{title}
			</div>

			{routes.map((route, idx) => (
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
								onChange={() => onToggleEnabled(idx)}
								className="checkbox checkbox-xs"
							/>
							<button
								type="button"
								onClick={() => onRemoveRoute(idx)}
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
							onChange={(e) => onAmountChange(idx, Number(e.target.value))}
							className="range range-xs flex-1"
						/>
						<span className="text-4xs text-cz-cream w-8 text-right">
							{route.amount.toFixed(2)}
						</span>
					</div>
				</div>
			))}

			<div className="pt-1 border-t border-cz-border">
				<div className="text-4xs uppercase tracking-[0.18em] text-cz-cream/70 mb-1">
					Add Source
				</div>
				<div className="flex flex-wrap gap-1">
					{MOD_SOURCES.map((src) => (
						<button
							key={src.value}
							type="button"
							onClick={() => onAddRoute(src.value)}
							className="px-1.5 py-0.5 text-4xs uppercase tracking-[0.12em] border border-cz-border bg-cz-inset text-cz-cream hover:border-cz-light-blue hover:text-white transition-colors"
						>
							{src.label}
						</button>
					))}
				</div>
			</div>

			<button
				type="button"
				onClick={onClose}
				className="w-full text-4xs uppercase tracking-[0.18em] text-cz-cream/70 hover:text-cz-cream pt-1"
			>
				Close
			</button>
		</div>
	);
}