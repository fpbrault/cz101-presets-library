import ControlKnob from "@/components/controls/ControlKnob";
import CzButton from "@/components/primitives/CzButton";
import { useSynthParam } from "@/features/synth/SynthParamController";

type ModModuleFrameProps = {
	title: string;
	accentClassName: string;
	enabled: boolean;
	onToggle: () => void;
	meta: string;
	className?: string;
	children: React.ReactNode;
};

function ModModuleFrame({
	title,
	accentClassName,
	enabled,
	onToggle,
	_meta,
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
		<div className="grid h-full min-h-0 grid-cols-2 auto-rows-fr gap-3">
			<ModModuleFrame
				title="Vibrato"
				accentClassName="text-cz-light-blue"
				enabled={vibratoEnabled}
				onToggle={() => setVibratoEnabled(!vibratoEnabled)}
				meta="Pitch"
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
				meta="Global"
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
				meta="Not Implemented"
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
				meta="Internal"
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
	);
}
