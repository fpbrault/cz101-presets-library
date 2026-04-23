import ControlKnob from "@/components/controls/ControlKnob";
import { useSynthParam } from "@/features/synth/SynthParamController";

const FX_METER_SEGMENTS = [
	"seg-a",
	"seg-b",
	"seg-c",
	"seg-d",
	"seg-e",
	"seg-f",
	"seg-g",
	"seg-h",
] as const;

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
				"relative overflow-hidden rounded-2xl border border-cz-border bg-[linear-gradient(180deg,rgba(39,39,41,0.98),rgba(22,22,22,0.98))] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_14px_30px_rgba(0,0,0,0.35)]",
				className,
			]
				.filter(Boolean)
				.join(" ")}
		>
			<div className="pointer-events-none absolute inset-x-3 top-0 h-px bg-white/8" />
			<div className="mb-3 flex items-start justify-between gap-3">
				<div>
					<div className="text-[0.55rem] font-mono uppercase tracking-[0.36em] text-cz-cream-dim">
						Processor
					</div>
					<div
						className={[
							"mt-1 font-mono text-sm font-bold uppercase tracking-[0.34em]",
							accentClassName,
						].join(" ")}
					>
						{title}
					</div>
				</div>
				<div className="flex items-start gap-3">
					<div className="grid grid-cols-4 gap-1 rounded-sm border border-cz-border bg-black/20 p-1">
						{FX_METER_SEGMENTS.map((segmentId, index) => (
							<span
								key={`${title}-${segmentId}`}
								className={`h-1.5 w-4 rounded-[1px] ${enabled && index < 5 ? "bg-cz-gold/80" : "bg-white/8"}`}
							/>
						))}
					</div>
					<button
						type="button"
						onClick={onToggle}
						className={`min-w-18 rounded-md border px-2 py-1 font-mono text-[0.6rem] font-bold uppercase tracking-[0.22em] transition-colors ${
							enabled
								? "border-cz-gold bg-cz-gold/15 text-cz-gold"
								: "border-cz-border bg-black/15 text-cz-cream-dim hover:text-cz-cream"
						}`}
					>
						{enabled ? "On" : "Off"}
					</button>
				</div>
			</div>
			<div className="mb-3 flex items-center justify-between rounded-md border border-cz-border/70 bg-black/20 px-2 py-1">
				<div className="text-[0.55rem] font-mono uppercase tracking-[0.26em] text-cz-light-blue">
					Bus Status
				</div>
				<div className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-cz-cream-dim">
					{meta}
				</div>
			</div>
			{children}
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
			<div className="rounded-xl border border-cz-border bg-[#2f2f31] px-3 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
				<div className="flex items-center justify-center gap-3">{children}</div>
			</div>
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
	const { value: delayMix, setValue: setDelayMix } =
		useSynthParam("delayMix");
	const { value: reverbEnabled, setValue: setReverbEnabled } =
		useSynthParam("reverbEnabled");
	const { value: reverbSize, setValue: setReverbSize } =
		useSynthParam("reverbSize");
	const { value: reverbMix, setValue: setReverbMix } =
		useSynthParam("reverbMix");

	return (
		<div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.08fr_0.92fr] xl:grid-cols-[1.15fr_0.92fr_0.92fr]">
				<CompactFxModule
					title="Chorus"
					accentClassName="text-cz-light-blue"
					enabled={chorusEnabled}
					onToggle={() => setChorusEnabled(!chorusEnabled)}
					meta="Stereo"
					className="lg:row-span-2"
				>
					<div className="grid grid-cols-3 gap-2">
						<ControlKnob
							value={chorusRate}
							onChange={setChorusRate}
							min={0.1}
							max={5}
							size={38}
							color="#7f9de4"
							label="Rate"
							valueFormatter={(value) => value.toFixed(1)}
						/>
						<ControlKnob
							value={chorusDepth}
							onChange={setChorusDepth}
							min={0}
							max={3}
							size={38}
							color="#7f9de4"
							label="Depth"
							valueFormatter={(value) => `${Math.round((value / 3) * 100)}%`}
						/>
						<ControlKnob
							value={chorusMix}
							onChange={setChorusMix}
							min={0}
							max={1}
							size={38}
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
							size={36}
							color="#7f9de4"
							label="Time"
							valueFormatter={(value) => `${Math.round(value * 1000)}ms`}
						/>
						<ControlKnob
							value={delayFeedback}
							onChange={setDelayFeedback}
							min={0}
							max={0.9}
							size={36}
							color="#7f9de4"
							label="Fdbk"
							valueFormatter={(value) => `${Math.round(value * 100)}%`}
						/>
						<ControlKnob
							value={delayMix}
							onChange={setDelayMix}
							min={0}
							max={1}
							size={36}
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
							size={38}
							color="#bfbd30"
							label="Size"
							valueFormatter={(value) => `${Math.round(value * 100)}%`}
						/>
						<ControlKnob
							value={reverbMix}
							onChange={setReverbMix}
							min={0}
							max={1}
							size={38}
							color="#3dff3d"
							label="Mix"
							valueFormatter={(value) => `${Math.round(value * 100)}%`}
						/>
					</div>
				</CompactFxModule>
		</div>
	);
}