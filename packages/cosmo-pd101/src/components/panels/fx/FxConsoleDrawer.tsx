import ControlKnob from "@/components/controls/ControlKnob";
import { useSynthParam } from "@/features/synth/SynthParamController";

type FxModuleFrameProps = {
	title: string;
	accentClassName: string;
	enabled: boolean;
	onToggle: () => void;
	meta: string;
	className?: string;
	children: React.ReactNode;
};

function FxModuleFrame({
	title,
	accentClassName,
	enabled,
	onToggle,
	meta,
	className,
	children,
}: FxModuleFrameProps) {
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
			<div className="mb-4 flex items-start justify-between gap-3">
				<div className="min-w-0">
					<div
						className={[
							"font-mono text-sm font-bold uppercase tracking-[0.3em]",
							enabled ? "opacity-100" : "opacity-85",
							accentClassName,
						].join(" ")}
					>
						{title}
					</div>
					<div
						className={`mt-1 text-[0.55rem] font-mono uppercase tracking-[0.22em] ${
							enabled ? "text-cz-cream/85" : "text-cz-cream-dim"
						}`}
					>
						{meta}
					</div>
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

type CompactFxModuleProps = {
	title: string;
	accentClassName: string;
	enabled: boolean;
	onToggle: () => void;
	meta: string;
	children: React.ReactNode;
	className?: string;
};

function CompactFxModule({
	title,
	accentClassName,
	enabled,
	onToggle,
	meta,
	children,
	className,
}: CompactFxModuleProps) {
	return (
		<FxModuleFrame
			title={title}
			accentClassName={accentClassName}
			enabled={enabled}
			onToggle={onToggle}
			meta={meta}
			className={className}
		>
			<div className="flex items-center justify-center gap-3">{children}</div>
		</FxModuleFrame>
	);
}

export default function FxConsoleDrawer() {
	const { value: chorusEnabled, setValue: setChorusEnabled } =
		useSynthParam("chorusEnabled");
	const { value: chorusRate, setValue: setChorusRate } =
		useSynthParam("chorusRate");
	const { value: chorusDepth, setValue: setChorusDepth } =
		useSynthParam("chorusDepth");
	const { value: chorusMix, setValue: setChorusMix } =
		useSynthParam("chorusMix");
	const { value: delayEnabled, setValue: setDelayEnabled } =
		useSynthParam("delayEnabled");
	const { value: delayTime, setValue: setDelayTime } =
		useSynthParam("delayTime");
	const { value: delayFeedback, setValue: setDelayFeedback } =
		useSynthParam("delayFeedback");
	const { value: delayMix, setValue: setDelayMix } = useSynthParam("delayMix");
	const { value: reverbEnabled, setValue: setReverbEnabled } =
		useSynthParam("reverbEnabled");
	const { value: reverbSize, setValue: setReverbSize } =
		useSynthParam("reverbSize");
	const { value: reverbMix, setValue: setReverbMix } =
		useSynthParam("reverbMix");

	return (
		<div className="grid h-full min-h-0 grid-cols-2 auto-rows-fr gap-3">
			<CompactFxModule
				title="Chorus"
				accentClassName="text-cz-light-blue"
				enabled={chorusEnabled}
				onToggle={() => setChorusEnabled(!chorusEnabled)}
				meta="Stereo"
			>
				<div className="grid grid-cols-3 gap-2">
					<ControlKnob
						value={chorusRate}
						onChange={setChorusRate}
						min={0.1}
						max={5}
						size={64}
						color="#7f9de4"
						label="Rate"
						valueFormatter={(value) => value.toFixed(1)}
					/>
					<ControlKnob
						value={chorusDepth}
						onChange={setChorusDepth}
						min={0}
						max={3}
						size={64}
						color="#7f9de4"
						label="Depth"
						valueFormatter={(value) => `${Math.round((value / 3) * 100)}%`}
					/>
					<ControlKnob
						value={chorusMix}
						onChange={setChorusMix}
						min={0}
						max={1}
						size={64}
						color="#bfbd30"
						label="Mix"
						valueFormatter={(value) => `${Math.round(value * 100)}%`}
					/>
				</div>
			</CompactFxModule>
			<CompactFxModule
				title="Delay"
				accentClassName="text-cz-light-blue"
				enabled={delayEnabled}
				onToggle={() => setDelayEnabled(!delayEnabled)}
				meta="Digital"
			>
				<div className="grid grid-cols-3 gap-2">
					<ControlKnob
						value={delayTime}
						onChange={setDelayTime}
						min={0.01}
						max={1}
						size={64}
						color="#7f9de4"
						label="Time"
						valueFormatter={(value) => `${Math.round(value * 1000)}ms`}
					/>
					<ControlKnob
						value={delayFeedback}
						onChange={setDelayFeedback}
						min={0}
						max={0.9}
						size={64}
						color="#7f9de4"
						label="Fdbk"
						valueFormatter={(value) => `${Math.round(value * 100)}%`}
					/>
					<ControlKnob
						value={delayMix}
						onChange={setDelayMix}
						min={0}
						max={1}
						size={64}
						color="#bfbd30"
						label="Mix"
						valueFormatter={(value) => `${Math.round(value * 100)}%`}
					/>
				</div>
			</CompactFxModule>
			<CompactFxModule
				title="Reverb"
				accentClassName="text-cz-gold"
				enabled={reverbEnabled}
				onToggle={() => setReverbEnabled(!reverbEnabled)}
				meta="Hall"
			>
				<div className="grid grid-cols-2 gap-2">
					<ControlKnob
						value={reverbSize}
						onChange={setReverbSize}
						min={0}
						max={1}
						size={64}
						color="#bfbd30"
						label="Size"
						valueFormatter={(value) => `${Math.round(value * 100)}%`}
					/>
					<ControlKnob
						value={reverbMix}
						onChange={setReverbMix}
						min={0}
						max={1}
						size={64}
						color="#3dff3d"
						label="Mix"
						valueFormatter={(value) => `${Math.round(value * 100)}%`}
					/>
				</div>
			</CompactFxModule>
		</div>
	);
}
