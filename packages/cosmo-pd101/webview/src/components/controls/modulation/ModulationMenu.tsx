import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import type { ModRoute, ModSource } from "@/lib/synth/bindings/synth";
import ModRouteRow, { MOD_SOURCE_META } from "./ModRouteRow";

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
	const [selectedSource, setSelectedSource] = useState<ModSource>("lfo1");

	return (
		<motion.div
			className="w-[248px] overflow-hidden rounded-xl border border-cz-gold/30 bg-cz-panel shadow-2xl"
			role="dialog"
			aria-label={`Modulation for ${title}`}
			initial={{ opacity: 0, scale: 0.92, y: -6 }}
			animate={{ opacity: 1, scale: 1, y: 0 }}
			exit={{ opacity: 0, scale: 0.92, y: -6 }}
			transition={{ duration: 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
			style={{ transformOrigin: "top center" }}
		>
			{/* Header */}
			<div className="flex items-center justify-between border-b border-cz-border/60 bg-cz-surface/80 px-3 py-2">
				<div className="flex items-center gap-2">
					<span className="h-1.5 w-1.5 rounded-full bg-cz-gold" />
					<span className="font-mono text-[0.62rem] font-bold uppercase tracking-[0.25em] text-cz-cream">
						{title}
					</span>
				</div>
				<button
					type="button"
					onClick={onClose}
					aria-label="Close modulation panel"
					className="flex h-5 w-5 items-center justify-center rounded text-cz-cream-dim/60 transition-colors hover:bg-cz-border/40 hover:text-cz-cream"
				>
					✕
				</button>
			</div>

			<div className="space-y-2 p-2.5">
				{/* Active routes */}
				{routes.length > 0 ? (
					<div className="space-y-1.5">
						<div className="font-mono text-[0.5rem] uppercase tracking-[0.2em] text-cz-cream-dim/60">
							Active
						</div>
						<AnimatePresence initial={false}>
							{routes.map((route, idx) => (
								<motion.div
									key={`${route.source}-${route.destination}`}
									initial={{ opacity: 0, x: -8 }}
									animate={{ opacity: 1, x: 0 }}
									exit={{ opacity: 0, x: 8, height: 0, marginTop: 0 }}
									transition={{
										duration: 0.14,
										ease: "easeOut",
										delay: idx * 0.04,
									}}
								>
									<ModRouteRow
										route={route}
										onToggleEnabled={() => onToggleEnabled(idx)}
										onRemove={() => onRemoveRoute(idx)}
										onAmountChange={(amount) => onAmountChange(idx, amount)}
									/>
								</motion.div>
							))}
						</AnimatePresence>
					</div>
				) : (
					<div className="flex items-center justify-center rounded-lg border border-dashed border-cz-border/50 py-3 font-mono text-[0.55rem] uppercase tracking-[0.18em] text-cz-cream-dim/50">
						No modulations
					</div>
				)}

				{/* Add source */}
				<div className="border-t border-cz-border/40 pt-2">
					<div className="font-mono text-[0.5rem] uppercase tracking-[0.2em] text-cz-cream-dim/60 mb-1.5">
						Add source
					</div>
					<div className="flex gap-1.5">
						<div className="relative flex-1">
							<select
								value={selectedSource}
								onChange={(e) => setSelectedSource(e.target.value as ModSource)}
								aria-label="Select modulation source"
								className="w-full appearance-none rounded-md border border-cz-border bg-cz-inset px-2 py-1.5 font-mono text-[0.58rem] uppercase tracking-[0.1em] text-cz-cream outline-none transition-colors hover:border-cz-light-blue/60 focus:border-cz-light-blue"
							>
								{MOD_SOURCES.map((src) => (
									<option key={src.value} value={src.value}>
										{src.label}
									</option>
								))}
							</select>
							<span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[0.5rem] text-cz-cream-dim/60">
								▾
							</span>
						</div>
						<button
							type="button"
							onClick={() => onAddRoute(selectedSource)}
							className={`shrink-0 rounded-md border px-2.5 py-1 font-mono text-[0.55rem] font-bold uppercase tracking-[0.15em] transition-colors ${
								MOD_SOURCE_META[selectedSource].colorClass
							} border-current/30 bg-current/10 hover:bg-current/20`}
						>
							Add
						</button>
					</div>
				</div>
			</div>
		</motion.div>
	);
}
