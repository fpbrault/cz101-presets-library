import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import ModRouteRow, {
	MOD_SOURCE_META,
} from "@/components/controls/modulation/ModRouteRow";
import { useModMatrix } from "@/context/ModMatrixContext";
import type {
	ModDestination,
	ModRoute,
	ModSource,
} from "@/lib/synth/bindings/synth";
import {
	getModDestinationGroups,
	getModDestinationLabel,
} from "@/lib/synth/modTargets";

const DESTINATION_GROUPS = getModDestinationGroups();

function destinationLabel(dest: ModDestination): string {
	return getModDestinationLabel(dest);
}

const MOD_SOURCES: { label: string; value: ModSource }[] = [
	{ label: "LFO 1", value: "lfo1" },
	{ label: "LFO 2", value: "lfo2" },
	{ label: "Random", value: "random" },
	{ label: "Mod Env", value: "modEnv" },
	{ label: "Velocity", value: "velocity" },
	{ label: "Mod Wheel", value: "modWheel" },
	{ label: "Aftertouch", value: "aftertouch" },
];

// ---------------------------------------------------------------------------
// ModMatrixPanel — full mod matrix list with add/remove
// ---------------------------------------------------------------------------

export default function ModMatrixPanel() {
	const { modMatrix, setModMatrix } = useModMatrix();
	const routes = modMatrix.routes ?? [];
	const nextRouteKeyRef = useRef(0);

	const [newSource, setNewSource] = useState<ModSource>("lfo1");
	const [newDest, setNewDest] = useState<ModDestination>("volume");
	const [routeKeys, setRouteKeys] = useState<string[]>(() =>
		routes.map(() => `mod-route-${nextRouteKeyRef.current++}`),
	);

	useEffect(() => {
		if (routeKeys.length === routes.length) {
			return;
		}

		setRouteKeys((currentKeys) => {
			if (currentKeys.length > routes.length) {
				return currentKeys.slice(0, routes.length);
			}

			return [
				...currentKeys,
				...Array.from(
					{ length: routes.length - currentKeys.length },
					() => `mod-route-${nextRouteKeyRef.current++}`,
				),
			];
		});
	}, [routeKeys.length, routes.length]);

	const handleAdd = () => {
		const route: ModRoute = {
			source: newSource,
			destination: newDest,
			amount: 0,
			enabled: true,
		};
		setRouteKeys((currentKeys) => [
			...currentKeys,
			`mod-route-${nextRouteKeyRef.current++}`,
		]);
		setModMatrix({ routes: [...routes, route] });
	};

	const handleRemove = (idx: number) => {
		const next = [...routes];
		next.splice(idx, 1);
		setRouteKeys((currentKeys) =>
			currentKeys.filter((_, keyIndex) => keyIndex !== idx),
		);
		setModMatrix({ routes: next });
	};

	const handleToggle = (idx: number) => {
		const next = routes.map((r, i) =>
			i === idx ? { ...r, enabled: !r.enabled } : r,
		);
		setModMatrix({ routes: next });
	};

	const handleAmount = (idx: number, amount: number) => {
		const next = routes.map((r, i) => (i === idx ? { ...r, amount } : r));
		setModMatrix({ routes: next });
	};

	const selectClass =
		"w-full appearance-none rounded-md border border-cz-border bg-cz-inset px-2 py-1.5 font-mono text-[0.58rem] uppercase tracking-[0.1em] text-cz-cream outline-none transition-colors hover:border-cz-light-blue/60 focus:border-cz-light-blue";

	return (
		<section className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-cz-border bg-cz-surface p-3 shadow-lg">
			{/* Header */}
			<div className="mb-2 flex items-center gap-2">
				<span className="font-mono text-sm font-bold uppercase tracking-[0.3em] text-cz-light-blue">
					Mod Matrix
				</span>
				{routes.length > 0 && (
					<span className="rounded-full border border-cz-light-blue/40 bg-cz-light-blue/15 px-1.5 font-mono text-5xs font-bold text-cz-light-blue">
						{routes.length}
					</span>
				)}
			</div>

			{/* Route list */}
			<div className="min-h-0 flex-1 overflow-y-auto space-y-1.5 pr-0.5 scrollbar-thin">
				<AnimatePresence initial={false}>
					{routes.length === 0 && (
						<motion.div
							key="empty"
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							className="flex h-16 items-center justify-center rounded-lg border border-dashed border-cz-border/50 font-mono text-[0.55rem] uppercase tracking-[0.18em] text-cz-cream-dim/50"
						>
							No routes
						</motion.div>
					)}
					{routes.map((route, idx) => (
						<motion.div
							key={routeKeys[idx]}
							initial={{ opacity: 0, x: -10 }}
							animate={{ opacity: 1, x: 0 }}
							exit={{ opacity: 0, x: 10, height: 0, marginTop: 0 }}
							transition={{ duration: 0.14, ease: "easeOut" }}
						>
							<ModRouteRow
								route={route}
								destinationLabel={destinationLabel(route.destination)}
								showDestination
								onToggleEnabled={() => handleToggle(idx)}
								onRemove={() => handleRemove(idx)}
								onAmountChange={(amount) => handleAmount(idx, amount)}
							/>
						</motion.div>
					))}
				</AnimatePresence>
			</div>

			{/* Add route form */}
			<div className="mt-2 border-t border-cz-border/40 pt-2 space-y-1.5">
				<div className="font-mono text-5xs uppercase tracking-[0.2em] text-cz-cream-dim/60">
					Add route
				</div>
				<div className="relative">
					<select
						value={newSource}
						onChange={(e) => setNewSource(e.target.value as ModSource)}
						aria-label="New route source"
						className={selectClass}
					>
						{MOD_SOURCES.map((s) => (
							<option key={s.value} value={s.value}>
								{s.label}
							</option>
						))}
					</select>
					<span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-5xs text-cz-cream-dim/60">
						▾
					</span>
				</div>
				<div className="relative">
					<select
						value={newDest}
						onChange={(e) => setNewDest(e.target.value as ModDestination)}
						aria-label="New route destination"
						className={selectClass}
					>
						{DESTINATION_GROUPS.map((group) => (
							<optgroup key={group.label} label={group.label}>
								{group.destinations.map((d) => (
									<option key={d.value} value={d.value}>
										{d.label}
									</option>
								))}
							</optgroup>
						))}
					</select>
					<span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-5xs text-cz-cream-dim/60">
						▾
					</span>
				</div>
				<button
					type="button"
					onClick={handleAdd}
					className={`w-full rounded-md border px-2 py-1.5 font-mono text-[0.55rem] font-bold uppercase tracking-[0.15em] transition-colors ${MOD_SOURCE_META[newSource].colorClass} border-current/30 bg-current/10 hover:bg-current/20`}
				>
					Add
				</button>
			</div>
		</section>
	);
}
