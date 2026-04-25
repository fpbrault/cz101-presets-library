import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import ControlKnob from "@/components/controls/ControlKnob";
import ModRouteRow, {
	MOD_SOURCE_META,
} from "@/components/controls/modulation/ModRouteRow";
import CompactButton from "@/components/primitives/CompactButton";
import ModuleFrame from "@/components/primitives/ModuleFrame";
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
	{ label: "Random", value: "random" },
	{ label: "Mod Env", value: "modEnv" },
	{ label: "Velocity", value: "velocity" },
	{ label: "Mod Wheel", value: "modWheel" },
	{ label: "Aftertouch", value: "aftertouch" },
];

// ---------------------------------------------------------------------------
// ModMatrixPanel — full mod matrix list with add/remove
// ---------------------------------------------------------------------------

function ModMatrixPanel() {
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

	const { value: lfoWaveform, setValue: setLfoWaveform } =
		useSynthParam("lfoWaveform");
	const { value: lfoRate, setValue: setLfoRate } = useSynthParam("lfoRate");
	const { value: lfoDepth, setValue: setLfoDepth } = useSynthParam("lfoDepth");
	const { value: lfoSymmetry, setValue: setLfoSymmetry } =
		useSynthParam("lfoSymmetry");
	const { value: lfoRetrigger, setValue: setLfoRetrigger } =
		useSynthParam("lfoRetrigger");
	const { value: lfoOffset, setValue: setLfoOffset } =
		useSynthParam("lfoOffset");
	const { value: lfo2Waveform, setValue: setLfo2Waveform } =
		useSynthParam("lfo2Waveform");
	const { value: lfo2Rate, setValue: setLfo2Rate } = useSynthParam("lfo2Rate");
	const { value: lfo2Depth, setValue: setLfo2Depth } =
		useSynthParam("lfo2Depth");
	const { value: lfo2Symmetry, setValue: setLfo2Symmetry } =
		useSynthParam("lfo2Symmetry");
	const { value: lfo2Retrigger, setValue: setLfo2Retrigger } =
		useSynthParam("lfo2Retrigger");
	const { value: lfo2Offset, setValue: setLfo2Offset } =
		useSynthParam("lfo2Offset");

	const { value: randomRate, setValue: setRandomRate } =
		useSynthParam("randomRate");

	const { value: modEnvAttack, setValue: setModEnvAttack } =
		useSynthParam("modEnvAttack");
	const { value: modEnvDecay, setValue: setModEnvDecay } =
		useSynthParam("modEnvDecay");
	const { value: modEnvSustain, setValue: setModEnvSustain } =
		useSynthParam("modEnvSustain");
	const { value: modEnvRelease, setValue: setModEnvRelease } =
		useSynthParam("modEnvRelease");

	const { value: phaseModEnabled, setValue: setPhaseModEnabled } =
		useSynthParam("phaseModEnabled");
	const { value: intPmAmount, setValue: setIntPmAmount } =
		useSynthParam("intPmAmount");
	const { value: intPmRatio, setValue: setIntPmRatio } =
		useSynthParam("intPmRatio");
	const { value: pmPre, setValue: setPmPre } = useSynthParam("pmPre");

	return (
		<div className="flex h-full min-h-0 gap-3">
			{/* Left: 2×3 module grid filling full height — row 1: Vibrato + Phase Mod, row 2: LFO 1 + LFO 2, row 3: Random + Mod Env */}
			<div className="flex-2 min-w-0 min-h-0 grid grid-cols-2 grid-rows-3 gap-2">
				<ModuleFrame
					title="Vibrato"
					color="#307948"
					enabled={vibratoEnabled}
					onToggle={() => setVibratoEnabled(!vibratoEnabled)}
				>
					<div className="flex flex-col gap-2 w-full">
						<div className="grid grid-cols-4 gap-1">
							{(["sine", "tri", "sq", "saw"] as const).map((w, i) => (
								<CompactButton
									key={w}
									active={vibratoWave === i + 1}
									onClick={() => setVibratoWave(i + 1)}
								>
									{w}
								</CompactButton>
							))}
						</div>
						<div className="grid grid-cols-3 gap-1.5">
							<ControlKnob
								value={vibratoRate}
								onChange={setVibratoRate}
								min={0}
								max={99}
								defaultValue={65}
								size={50}
								color="#307948"
								label="Rate"
								valueFormatter={(v) => `${Math.round(v)}`}
							/>
							<ControlKnob
								value={vibratoDepth}
								onChange={setVibratoDepth}
								min={0}
								max={99}
								defaultValue={20}
								size={50}
								color="#307948"
								label="Depth"
								valueFormatter={(v) => `${Math.round(v)}`}
							/>
							<ControlKnob
								value={vibratoDelay}
								onChange={setVibratoDelay}
								min={0}
								max={5000}
								defaultValue={0}
								size={50}
								color="#307948"
								label="Delay"
								valueFormatter={(v) => `${Math.round(v)}ms`}
							/>
						</div>
					</div>
				</ModuleFrame>

				<ModuleFrame
					title="Phase Mod"
					color="#be3330"
					enabled={phaseModEnabled}
					onToggle={() => setPhaseModEnabled(!phaseModEnabled)}
				>
					<div className="grid grid-cols-3 gap-2.5 w-full">
						<ControlKnob
							value={intPmAmount}
							onChange={setIntPmAmount}
							min={0}
							max={0.3}
							defaultValue={0.03}
							size={50}
							color="#be3330"
							label="Amount"
							valueFormatter={(value) => value.toFixed(2)}
						/>
						<ControlKnob
							value={intPmRatio}
							onChange={setIntPmRatio}
							min={0.5}
							max={4}
							defaultValue={1.0}
							size={50}
							color="#be3330"
							label="Ratio"
							valueFormatter={(value) => value.toFixed(1)}
						/>
						<CompactButton
							active={pmPre}
							onClick={() => setPmPre(!pmPre)}
							className="h-8 self-center px-2"
						>
							Pre
						</CompactButton>
					</div>
				</ModuleFrame>

				<ModuleFrame title="LFO 1" color="#27588f" enabled>
					<div className="flex flex-col gap-2 w-full">
						<div className="grid grid-cols-3 gap-1">
							{(
								[
									["sine", "sine"],
									["tri", "triangle"],
									["sq", "square"],
									["saw", "saw"],
									["inv", "invertedSaw"],
									["rnd", "random"],
								] as const
							).map(([label, w]) => (
								<CompactButton
									key={w}
									active={lfoWaveform === w}
									onClick={() => setLfoWaveform(w)}
								>
									{label}
								</CompactButton>
							))}
						</div>
						<div className="grid grid-cols-4 gap-1.5">
							<ControlKnob
								value={lfoRate}
								onChange={setLfoRate}
								min={0}
								max={20}
								defaultValue={5}
								size={40}
								color="#27588f"
								label="Rate"
								valueFormatter={(v) => `${v.toFixed(1)}Hz`}
							/>
							<ControlKnob
								value={lfoDepth}
								onChange={setLfoDepth}
								min={0}
								max={1}
								defaultValue={1.0}
								size={40}
								color="#27588f"
								label="Depth"
								valueFormatter={(v) => `${Math.round(v * 100)}%`}
							/>
							<ControlKnob
								value={lfoOffset}
								onChange={setLfoOffset}
								min={-1}
								max={1}
								defaultValue={0}
								size={40}
								color="#27588f"
								label="Offset"
								valueFormatter={(v) => `${Math.round(v * 100)}%`}
							/>
							<ControlKnob
								value={lfoSymmetry}
								onChange={setLfoSymmetry}
								min={0}
								max={1}
								defaultValue={0.5}
								size={40}
								color="#27588f"
								label="Sym."
								valueFormatter={(v) => `${Math.round(v * 100)}%`}
							/>
						</div>
						<div className="flex justify-end">
							<CompactButton
								active={lfoRetrigger}
								onClick={() => setLfoRetrigger(!lfoRetrigger)}
								className="px-2"
							>
								Retrig
							</CompactButton>
						</div>
					</div>
				</ModuleFrame>

				<ModuleFrame title="LFO 2" color="#d7ac3d" enabled>
					<div className="flex flex-col gap-2 w-full">
						<div className="grid grid-cols-3 gap-1">
							{(
								[
									["sine", "sine"],
									["tri", "triangle"],
									["sq", "square"],
									["saw", "saw"],
									["inv", "invertedSaw"],
									["rnd", "random"],
								] as const
							).map(([label, w]) => (
								<CompactButton
									key={w}
									active={lfo2Waveform === w}
									onClick={() => setLfo2Waveform(w)}
								>
									{label}
								</CompactButton>
							))}
						</div>
						<div className="grid grid-cols-4 gap-1.5">
							<ControlKnob
								value={lfo2Rate}
								onChange={setLfo2Rate}
								min={0}
								max={20}
								defaultValue={5}
								size={40}
								color="#d7ac3d"
								label="Rate"
								valueFormatter={(v) => `${v.toFixed(1)}Hz`}
							/>
							<ControlKnob
								value={lfo2Depth}
								onChange={setLfo2Depth}
								min={0}
								max={1}
								defaultValue={1.0}
								size={40}
								color="#d7ac3d"
								label="Depth"
								valueFormatter={(v) => `${Math.round(v * 100)}%`}
							/>
							<ControlKnob
								value={lfo2Offset}
								onChange={setLfo2Offset}
								min={-1}
								max={1}
								defaultValue={0}
								size={40}
								color="#d7ac3d"
								label="Offset"
								valueFormatter={(v) => `${Math.round(v * 100)}%`}
							/>
							<ControlKnob
								value={lfo2Symmetry}
								onChange={setLfo2Symmetry}
								min={0}
								max={1}
								defaultValue={0.5}
								size={40}
								color="#d7ac3d"
								label="Sym."
								valueFormatter={(v) => `${Math.round(v * 100)}%`}
							/>
						</div>
						<div className="flex justify-end">
							<CompactButton
								active={lfo2Retrigger}
								onClick={() => setLfo2Retrigger(!lfo2Retrigger)}
								className="px-2"
							>
								Retrig
							</CompactButton>
						</div>
					</div>
				</ModuleFrame>

				<ModuleFrame title="Random" color="#c2571a" enabled>
					<div className="flex flex-col gap-2 w-full">
						<ControlKnob
							value={randomRate}
							onChange={setRandomRate}
							min={0.05}
							max={20}
							defaultValue={2}
							size={50}
							color="#c2571a"
							label="Rate"
							valueFormatter={(v) => `${v.toFixed(2)}Hz`}
						/>
					</div>
				</ModuleFrame>

				<ModuleFrame title="Mod Env" color="#c24587" enabled>
					<div className="flex flex-col gap-2 w-full">
						<div className="grid grid-cols-4 gap-1.5">
							<ControlKnob
								value={modEnvAttack}
								onChange={setModEnvAttack}
								min={0}
								max={10}
								defaultValue={0.01}
								size={40}
								color="#c24587"
								label="Atk"
								valueFormatter={(v) => `${v.toFixed(2)}s`}
							/>
							<ControlKnob
								value={modEnvDecay}
								onChange={setModEnvDecay}
								min={0}
								max={10}
								defaultValue={0.1}
								size={40}
								color="#c24587"
								label="Dec"
								valueFormatter={(v) => `${v.toFixed(2)}s`}
							/>
							<ControlKnob
								value={modEnvSustain}
								onChange={setModEnvSustain}
								min={0}
								max={1}
								defaultValue={0.5}
								size={40}
								color="#c24587"
								label="Sus"
								valueFormatter={(v) => `${Math.round(v * 100)}%`}
							/>
							<ControlKnob
								value={modEnvRelease}
								onChange={setModEnvRelease}
								min={0}
								max={10}
								defaultValue={0.2}
								size={40}
								color="#c24587"
								label="Rel"
								valueFormatter={(v) => `${v.toFixed(2)}s`}
							/>
						</div>
					</div>
				</ModuleFrame>
			</div>

			{/* Right: Mod Matrix panel */}
			<div className="flex-1 min-w-0 min-h-0">
				<ModMatrixPanel />
			</div>
		</div>
	);
}
