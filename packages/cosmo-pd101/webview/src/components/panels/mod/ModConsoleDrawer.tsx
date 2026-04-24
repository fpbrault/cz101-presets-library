import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import ControlKnob from "@/components/controls/ControlKnob";
import ModRouteRow, {
	MOD_SOURCE_META,
} from "@/components/controls/modulation/ModRouteRow";
import CzButton from "@/components/primitives/CzButton";
import { useModMatrix } from "@/context/ModMatrixContext";
import { useSynthParam } from "@/features/synth/SynthParamController";
import type {
	ModDestination,
	ModRoute,
	ModSource,
} from "@/lib/synth/bindings/synth";

// ---------------------------------------------------------------------------
// Destination metadata
// ---------------------------------------------------------------------------

const DESTINATION_GROUPS: {
	label: string;
	destinations: { value: ModDestination; label: string }[];
}[] = [
	{
		label: "Global",
		destinations: [
			{ value: "volume", label: "Volume" },
			{ value: "pitch", label: "Pitch" },
			{ value: "intPmAmount", label: "PM Amount" },
		],
	},
	{
		label: "Line 1",
		destinations: [
			{ value: "line1DcwBase", label: "L1 DCW" },
			{ value: "line1DcaBase", label: "L1 DCA" },
			{ value: "line1AlgoBlend", label: "L1 Algo Blend" },
			{ value: "line1Detune", label: "L1 Detune" },
			{ value: "line1Octave", label: "L1 Octave" },
			{ value: "line1AlgoParam1", label: "L1 Param 1" },
			{ value: "line1AlgoParam2", label: "L1 Param 2" },
			{ value: "line1AlgoParam3", label: "L1 Param 3" },
			{ value: "line1AlgoParam4", label: "L1 Param 4" },
			{ value: "line1AlgoParam5", label: "L1 Param 5" },
			{ value: "line1AlgoParam6", label: "L1 Param 6" },
			{ value: "line1AlgoParam7", label: "L1 Param 7" },
			{ value: "line1AlgoParam8", label: "L1 Param 8" },
		],
	},
	{
		label: "Line 2",
		destinations: [
			{ value: "line2DcwBase", label: "L2 DCW" },
			{ value: "line2DcaBase", label: "L2 DCA" },
			{ value: "line2AlgoBlend", label: "L2 Algo Blend" },
			{ value: "line2Detune", label: "L2 Detune" },
			{ value: "line2Octave", label: "L2 Octave" },
			{ value: "line2AlgoParam1", label: "L2 Param 1" },
			{ value: "line2AlgoParam2", label: "L2 Param 2" },
			{ value: "line2AlgoParam3", label: "L2 Param 3" },
			{ value: "line2AlgoParam4", label: "L2 Param 4" },
			{ value: "line2AlgoParam5", label: "L2 Param 5" },
			{ value: "line2AlgoParam6", label: "L2 Param 6" },
			{ value: "line2AlgoParam7", label: "L2 Param 7" },
			{ value: "line2AlgoParam8", label: "L2 Param 8" },
		],
	},
	{
		label: "FX",
		destinations: [
			{ value: "filterCutoff", label: "Filter Cutoff" },
			{ value: "filterResonance", label: "Filter Res" },
			{ value: "filterEnvAmount", label: "Filter Env" },
			{ value: "chorusMix", label: "Chorus Mix" },
			{ value: "delayMix", label: "Delay Mix" },
			{ value: "reverbMix", label: "Reverb Mix" },
		],
	},
	{
		label: "Modulation",
		destinations: [
			{ value: "vibratoDepth", label: "Vibrato Depth" },
			{ value: "lfoDepth", label: "LFO Depth" },
			{ value: "lfoRate", label: "LFO Rate" },
		],
	},
];

const ALL_DESTINATIONS = DESTINATION_GROUPS.flatMap((g) => g.destinations);

function destinationLabel(dest: ModDestination): string {
	return ALL_DESTINATIONS.find((d) => d.value === dest)?.label ?? dest;
}

const MOD_SOURCES: { label: string; value: ModSource }[] = [
	{ label: "LFO 1", value: "lfo1" },
	{ label: "LFO 2", value: "lfo2" },
	{ label: "Velocity", value: "velocity" },
	{ label: "Mod Wheel", value: "modWheel" },
	{ label: "Aftertouch", value: "aftertouch" },
];

// ---------------------------------------------------------------------------
// ModModuleFrame
// ---------------------------------------------------------------------------

type ModModuleFrameProps = {
	title: string;
	accentClassName: string;
	enabled: boolean;
	onToggle: () => void;
	className?: string;
	children: React.ReactNode;
};

function ModModuleFrame({
	title,
	accentClassName,
	enabled,
	onToggle,
	className,
	children,
}: ModModuleFrameProps) {
	return (
		<section
			className={[
				enabled
					? "relative flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-cz-gold/45 bg-cz-panel/80 p-3 shadow-xl"
					: "relative flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-cz-border bg-cz-surface p-3 shadow-lg",
				className,
			]
				.filter(Boolean)
				.join(" ")}
		>
			<div className="mb-1 flex items-start justify-between gap-3">
				<div className="min-w-0">
					<span
						className={[
							"font-mono text-sm font-bold uppercase tracking-[0.3em]",
							enabled ? "opacity-100" : "opacity-85",
							accentClassName,
						].join(" ")}
					>
						{title}
					</span>
				</div>
				<button
					type="button"
					onClick={onToggle}
					className={`min-w-16 rounded-md border px-2 py-1 font-mono text-[0.6rem] font-bold uppercase tracking-[0.22em] transition-colors ${
						enabled
							? "border-cz-gold bg-cz-gold/15 text-cz-gold"
							: "border-cz-border bg-black/15 text-cz-cream-dim hover:text-cz-cream"
					}`}
				>
					{enabled ? "On" : "Off"}
				</button>
			</div>
			<div
				className={`flex min-h-0 flex-1 items-center justify-center rounded-xl border px-3 py-4 transition-colors ${
					enabled
						? "border-cz-gold/50 bg-cz-inset"
						: "border-cz-border/70 bg-cz-inset/70"
				}`}
			>
				{children}
			</div>
		</section>
	);
}

// ---------------------------------------------------------------------------
// ModMatrixPanel — full mod matrix list with add/remove
// ---------------------------------------------------------------------------

function ModMatrixPanel() {
	const { modMatrix, setModMatrix } = useModMatrix();
	const routes = modMatrix.routes ?? [];

	const [newSource, setNewSource] = useState<ModSource>("lfo1");
	const [newDest, setNewDest] = useState<ModDestination>("volume");

	const handleAdd = () => {
		const route: ModRoute = {
			source: newSource,
			destination: newDest,
			amount: 0,
			enabled: true,
		};
		setModMatrix({ routes: [...routes, route] });
	};

	const handleRemove = (idx: number) => {
		const next = [...routes];
		next.splice(idx, 1);
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
					<span className="rounded-full border border-cz-light-blue/40 bg-cz-light-blue/15 px-1.5 font-mono text-[0.5rem] font-bold text-cz-light-blue">
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
							key={`${route.source}-${route.destination}`}
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
				<div className="font-mono text-[0.5rem] uppercase tracking-[0.2em] text-cz-cream-dim/60">
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
					<span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[0.5rem] text-cz-cream-dim/60">
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
					<span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[0.5rem] text-cz-cream-dim/60">
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

// ---------------------------------------------------------------------------
// ModConsoleDrawer
// ---------------------------------------------------------------------------

export default function ModConsoleDrawer() {
	const { value: vibratoEnabled, setValue: setVibratoEnabled } =
		useSynthParam("vibratoEnabled");
	const { value: vibratoWave, setValue: setVibratoWave } =
		useSynthParam("vibratoWave");
	const { value: vibratoRate, setValue: setVibratoRate } =
		useSynthParam("vibratoRate");
	const { value: vibratoDepth, setValue: setVibratoDepth } =
		useSynthParam("vibratoDepth");
	const { value: vibratoDelay, setValue: setVibratoDelay } =
		useSynthParam("vibratoDelay");

	const { value: lfoEnabled, setValue: setLfoEnabled } =
		useSynthParam("lfoEnabled");
	const { value: lfoWaveform, setValue: setLfoWaveform } =
		useSynthParam("lfoWaveform");
	const { value: lfoRate, setValue: setLfoRate } = useSynthParam("lfoRate");
	const { value: lfoDepth, setValue: setLfoDepth } = useSynthParam("lfoDepth");
	const { value: lfoOffset, setValue: setLfoOffset } =
		useSynthParam("lfoOffset");

	const { value: phaseModEnabled, setValue: setPhaseModEnabled } =
		useSynthParam("phaseModEnabled");
	const { value: intPmAmount, setValue: setIntPmAmount } =
		useSynthParam("intPmAmount");
	const { value: intPmRatio, setValue: setIntPmRatio } =
		useSynthParam("intPmRatio");
	const { value: pmPre, setValue: setPmPre } = useSynthParam("pmPre");

	return (
		<div className="grid h-full min-h-0 grid-cols-3 gap-3">
			{/* Left: 2×2 module grid (2/3 width) */}
			<div className="col-span-2 grid grid-cols-2 auto-rows-fr gap-3">
				<ModModuleFrame
					title="Vibrato"
					accentClassName="text-cz-light-blue"
					enabled={vibratoEnabled}
					onToggle={() => setVibratoEnabled(!vibratoEnabled)}
				>
					<div className="grid grid-cols-4 gap-2.5">
						{(["sine", "tri", "sq", "saw"] as const).map((w, i) => (
							<CzButton
								key={w}
								active={vibratoWave === i + 1}
								onClick={() => setVibratoWave(i + 1)}
								className="[&_button]:h-5 [&_button]:w-8 [&_button]:px-0 [&_button]:text-[0.58rem]"
							>
								{w}
							</CzButton>
						))}
						<ControlKnob
							value={vibratoRate}
							onChange={setVibratoRate}
							min={0}
							max={99}
							size={56}
							color="#7f9de4"
							label="Rate"
							valueFormatter={(v) => `${Math.round(v)}`}
						/>
						<ControlKnob
							value={vibratoDepth}
							onChange={setVibratoDepth}
							min={0}
							max={99}
							size={56}
							color="#7f9de4"
							label="Depth"
							valueFormatter={(v) => `${Math.round(v)}`}
						/>
						<ControlKnob
							value={vibratoDelay}
							onChange={setVibratoDelay}
							min={0}
							max={5000}
							size={56}
							color="#7f9de4"
							label="Delay"
							valueFormatter={(v) => `${Math.round(v)}ms`}
						/>
					</div>
				</ModModuleFrame>

				<ModModuleFrame
					title="LFO 1"
					accentClassName="text-cz-light-blue"
					enabled={lfoEnabled}
					onToggle={() => setLfoEnabled(!lfoEnabled)}
				>
					<div className="grid grid-cols-4 gap-2.5">
						{(["sine", "triangle", "square", "saw"] as const).map((w) => (
							<CzButton
								key={w}
								active={lfoWaveform === w}
								onClick={() => setLfoWaveform(w)}
								className="[&_button]:h-5 [&_button]:w-8 [&_button]:px-0 [&_button]:text-[0.55rem]"
							>
								{w}
							</CzButton>
						))}
						<ControlKnob
							value={lfoRate}
							onChange={setLfoRate}
							min={0}
							max={20}
							size={56}
							color="#7f9de4"
							label="Rate"
							valueFormatter={(v) => `${v.toFixed(1)}Hz`}
						/>
						<ControlKnob
							value={lfoDepth}
							onChange={setLfoDepth}
							min={0}
							max={1}
							size={56}
							color="#7f9de4"
							label="Depth"
							valueFormatter={(v) => `${Math.round(v * 100)}%`}
						/>
						<ControlKnob
							value={lfoOffset}
							onChange={setLfoOffset}
							min={-1}
							max={1}
							size={56}
							color="#7f9de4"
							label="Offset"
							valueFormatter={(v) => `${Math.round(v * 100)}%`}
						/>
					</div>
				</ModModuleFrame>

				<ModModuleFrame
					title="LFO 2"
					accentClassName="text-cz-light-blue"
					enabled={false}
					onToggle={() => void 0}
				>
					<div className="flex h-full min-h-28 w-full items-center justify-center rounded-lg border border-dashed border-cz-border/70 bg-cz-panel/60 px-4 text-center font-mono text-xs uppercase tracking-[0.2em] text-cz-cream-dim">
						LFO 2 coming soon
					</div>
				</ModModuleFrame>

				<ModModuleFrame
					title="Phase Mod"
					accentClassName="text-cz-light-blue"
					enabled={phaseModEnabled}
					onToggle={() => setPhaseModEnabled(!phaseModEnabled)}
				>
					<div className="grid grid-cols-3 gap-2.5">
						<ControlKnob
							value={intPmAmount}
							onChange={setIntPmAmount}
							min={0}
							max={0.3}
							size={56}
							color="#7f9de4"
							label="Amount"
							valueFormatter={(value) => value.toFixed(2)}
						/>
						<ControlKnob
							value={intPmRatio}
							onChange={setIntPmRatio}
							min={0.5}
							max={4}
							size={56}
							color="#7f9de4"
							label="Ratio"
							valueFormatter={(value) => value.toFixed(1)}
						/>
						<button
							type="button"
							onClick={() => setPmPre(!pmPre)}
							className={`h-14 rounded-lg border px-2 font-mono text-[0.56rem] font-bold uppercase tracking-[0.2em] transition-colors ${
								pmPre
									? "border-cz-light-blue bg-cz-light-blue/15 text-cz-light-blue"
									: "border-cz-border bg-black/15 text-cz-cream-dim hover:text-cz-cream"
							}`}
						>
							Pre
						</button>
					</div>
				</ModModuleFrame>
			</div>

			{/* Right: Mod Matrix panel */}
			<ModMatrixPanel />
		</div>
	);
}
