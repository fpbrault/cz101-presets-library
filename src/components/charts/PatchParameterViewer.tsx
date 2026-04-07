import type React from "react";
import { memo } from "react";
import EnvelopeChart from "@/components/charts/EnvelopeChart";
import WaveformDisplay from "@/components/charts/WaveformDisplay";
import { type DecodedPatch, decodeCzPatch } from "@/lib/midi/czSysexDecoder";

interface PatchParameterViewerProps {
	sysexData: Uint8Array;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const NOTE_NAMES = [
	"C",
	"C#",
	"D",
	"D#",
	"E",
	"F",
	"F#",
	"G",
	"G#",
	"A",
	"A#",
	"B",
];

const ParamRow: React.FC<{
	label: string;
	value: React.ReactNode;
	mono?: boolean;
}> = ({ label, value, mono }) => (
	<div className="flex justify-between items-center gap-2 py-0.5">
		<span className="text-[10px] uppercase tracking-wider text-base-content/40 shrink-0">
			{label}
		</span>
		<span
			className={`text-xs font-semibold text-right ${mono ? "font-mono" : ""}`}
		>
			{value}
		</span>
	</div>
);

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => (
	<div className="flex items-center gap-2 mt-3 mb-1">
		<span className="text-[9px] uppercase tracking-widest font-bold text-primary/70">
			{children}
		</span>
		<div className="flex-1 h-px bg-primary/20" />
	</div>
);

const ValueBar: React.FC<{
	value: number;
	max?: number;
	className?: string;
}> = ({ value, max = 99, className = "progress-primary" }) => {
	const clamped = Math.max(0, Math.min(max, value));
	return (
		<div className="flex items-center justify-end gap-2 min-w-[120px]">
			<progress
				className={`progress w-20 h-1.5 ${className}`}
				value={clamped}
				max={max}
			></progress>
			<span className="w-8 text-[10px] font-mono text-right text-base-content/70">
				{clamped}
			</span>
		</div>
	);
};

// ---------------------------------------------------------------------------
// Envelope group (DCA + DCW + DCO for one line)
// ---------------------------------------------------------------------------

type LineId = "Line 1" | "Line 2";

const EnvelopeGroup: React.FC<{
	lineId: LineId;
	dca: DecodedPatch["dca1"];
	dcw: DecodedPatch["dcw1"];
	dco: DecodedPatch["dco1Env"];
	dcaKf: number;
	dcwKf: number;
}> = ({ lineId, dca, dcw, dco, dcaKf, dcwKf }) => {
	const lineNum = lineId === "Line 1" ? "1" : "2";
	return (
		<div className="flex flex-col gap-3">
			<div className="flex items-center gap-2 mt-1">
				<span className="badge badge-outline badge-xs text-[9px] font-mono">
					{lineId}
				</span>
			</div>
			<div className="flex flex-col gap-2">
				<EnvelopeChart
					steps={dca.steps}
					endStep={dca.endStep}
					label={`DCA${lineNum} — Amplitude  ·  KF ${dcaKf}`}
					color="#a78bfa"
				/>
				<EnvelopeChart
					steps={dcw.steps}
					endStep={dcw.endStep}
					label={`DCW${lineNum} — Filter  ·  KF ${dcwKf}`}
					color="#34d399"
				/>
				<EnvelopeChart
					steps={dco.steps}
					endStep={dco.endStep}
					label={`DCO${lineNum} — Pitch`}
					color="#f59e0b"
				/>
			</div>
		</div>
	);
};

const CollapsibleSection: React.FC<{
	title: string;
	defaultOpen?: boolean;
	children: React.ReactNode;
}> = ({ title, defaultOpen = true, children }) => (
	<details
		open={defaultOpen}
		className="group rounded-lg border border-base-content/10 bg-base-300/20 overflow-hidden"
	>
		<summary className="flex items-center gap-2 px-3 py-2 cursor-pointer select-none hover:bg-base-300/40 transition-colors">
			<span className="text-[10px] uppercase tracking-widest font-bold text-primary/80">
				{title}
			</span>
			<span className="ml-auto text-xs text-base-content/35 group-open:rotate-90 transition-transform">
				▶
			</span>
		</summary>
		<div className="px-3 pb-3 pt-1 border-t border-base-content/10">
			{children}
		</div>
	</details>
);

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const PatchParameterViewer: React.FC<PatchParameterViewerProps> = memo(
	({ sysexData }) => {
		const patch = decodeCzPatch(sysexData);

		if (!patch) {
			return (
				<div className="flex items-center justify-center h-16 text-xs text-base-content/30 italic">
					No valid SysEx data
				</div>
			);
		}

		const hasDualLine =
			patch.lineSelect === "L1+1'" || patch.lineSelect === "L1+2'";
		const isLine2Only = patch.lineSelect === "L2";

		return (
			<div className="flex flex-col gap-2 rounded-xl bg-base-300/40 border border-base-content/10 overflow-hidden">
				<CollapsibleSection title="Core Params" defaultOpen>
					<div className="flex flex-col">
						<SectionTitle>Voice Setup</SectionTitle>
						<ParamRow label="Line" value={patch.lineSelect} mono />
						<ParamRow
							label="Octave"
							value={`${patch.octave > 0 ? "+" : ""}${patch.octave}`}
							mono
						/>

						<SectionTitle>Waveforms</SectionTitle>
						<div className="flex flex-col gap-4 pt-1">
							<WaveformDisplay
								line="DCO1"
								config={patch.dco1}
								disabled={isLine2Only}
							/>
							<div className="h-px bg-base-content/10" />
							<WaveformDisplay
								line="DCO2"
								config={patch.dco2}
								disabled={!hasDualLine && !isLine2Only}
							/>
						</div>

						<SectionTitle>Detune</SectionTitle>
						<ParamRow
							label="Direction"
							value={
								<span
									className={
										patch.detuneDirection === "-"
											? "text-error"
											: "text-success"
									}
								>
									{patch.detuneDirection === "-" ? "▼ Down" : "▲ Up"}
								</span>
							}
						/>
						<ParamRow label="Fine" value={patch.detuneFine} mono />
						<ParamRow
							label="Coarse"
							value={`Oct ${patch.detuneOctave}  ${NOTE_NAMES[patch.detuneNote]}`}
							mono
						/>

						<SectionTitle>Vibrato</SectionTitle>
						<ParamRow label="Wave" value={`Wave ${patch.vibratoWave}`} mono />
						<ParamRow
							label="Delay"
							value={
								<ValueBar
									value={patch.vibratoDelay}
									className="progress-info"
								/>
							}
						/>
						<ParamRow
							label="Rate"
							value={
								<ValueBar
									value={patch.vibratoRate}
									className="progress-secondary"
								/>
							}
						/>
						<ParamRow
							label="Depth"
							value={
								<ValueBar
									value={patch.vibratoDepth}
									className="progress-accent"
								/>
							}
						/>
					</div>
				</CollapsibleSection>

				<CollapsibleSection title="Envelopes" defaultOpen>
					<div className="flex flex-col gap-2 pt-1">
						{!isLine2Only && (
							<EnvelopeGroup
								lineId="Line 1"
								dca={patch.dca1}
								dcw={patch.dcw1}
								dco={patch.dco1Env}
								dcaKf={patch.dca1KeyFollow}
								dcwKf={patch.dcw1KeyFollow}
							/>
						)}
						{(hasDualLine || isLine2Only) && (
							<EnvelopeGroup
								lineId="Line 2"
								dca={patch.dca2}
								dcw={patch.dcw2}
								dco={patch.dco2Env}
								dcaKf={patch.dca2KeyFollow}
								dcwKf={patch.dcw2KeyFollow}
							/>
						)}
					</div>
				</CollapsibleSection>
			</div>
		);
	},
);

PatchParameterViewer.displayName = "PatchParameterViewer";

export default PatchParameterViewer;
