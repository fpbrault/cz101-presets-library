import type React from "react";
import { memo } from "react";
import {
	type ModulationType,
	type WaveformConfig,
	type WaveformId,
	WF_NAMES,
} from "@/lib/midi/czSysexDecoder";

// ---------------------------------------------------------------------------
// Mini SVG waveform icons
// ---------------------------------------------------------------------------

const WaveIcon: React.FC<{ id: WaveformId; size?: number }> = ({
	id,
	size = 32,
}) => {
	const s = size;
	const mid = s / 2;
	const stroke = "currentColor";
	const sw = 1.5;

	const shapes: Record<WaveformId, React.ReactNode> = {
		1: ( // Sawtooth
			<polyline
				points={`4,${s - 4} 4,4 ${s - 4},${s - 4} ${s - 4},4`}
				fill="none"
				stroke={stroke}
				strokeWidth={sw}
				strokeLinejoin="round"
			/>
		),
		2: ( // Square
			<polyline
				points={`4,${s - 4} 4,4 ${mid},4 ${mid},${s - 4} ${s - 4},${s - 4} ${s - 4},4`}
				fill="none"
				stroke={stroke}
				strokeWidth={sw}
				strokeLinejoin="round"
			/>
		),
		3: ( // Pulse (narrow square)
			<polyline
				points={`4,${s - 4} 4,4 ${mid - 4},4 ${mid - 4},${s - 4} ${s - 4},${s - 4} ${s - 4},4`}
				fill="none"
				stroke={stroke}
				strokeWidth={sw}
				strokeLinejoin="round"
			/>
		),
		4: ( // Double Sine – two bumps
			<path
				d={`M 4,${mid} Q ${s / 4},4 ${mid},${mid} Q ${(3 * s) / 4},${s - 4} ${s - 4},${mid}`}
				fill="none"
				stroke={stroke}
				strokeWidth={sw}
			/>
		),
		5: ( // Saw-Pulse
			<polyline
				points={`4,${s - 4} 4,4 ${mid - 4},${s - 4} ${mid - 4},4 ${s - 4},${s - 4}`}
				fill="none"
				stroke={stroke}
				strokeWidth={sw}
				strokeLinejoin="round"
			/>
		),
		6: ( // Resonance 1 – sine with ripple
			<path
				d={`M 4,${mid} Q ${s / 5},4 ${mid},${mid} Q ${(4 * s) / 5},${s - 4} ${s - 4},${mid}`}
				fill="none"
				stroke={stroke}
				strokeWidth={sw}
			/>
		),
		7: ( // Resonance 2
			<path
				d={`M 4,${mid} C ${s / 4},4 ${(3 * s) / 4},4 ${s - 4},${mid} C ${(3 * s) / 4},${s - 6} ${s / 4},${s - 6} 4,${mid}`}
				fill="none"
				stroke={stroke}
				strokeWidth={sw}
			/>
		),
		8: ( // Resonance 3 – tighter
			<path
				d={`M 4,${mid} C ${s / 3},2 ${(2 * s) / 3},2 ${s - 4},${mid} C ${(2 * s) / 3},${s - 2} ${s / 3},${s - 2} 4,${mid}`}
				fill="none"
				stroke={stroke}
				strokeWidth={sw}
			/>
		),
	};

	return (
		<svg
			width={s}
			height={s}
			viewBox={`0 0 ${s} ${s}`}
			className="text-current shrink-0"
		>
			{shapes[id]}
		</svg>
	);
};

// ---------------------------------------------------------------------------
// Modulation badge
// ---------------------------------------------------------------------------

const MOD_LABELS: Record<ModulationType, string> = {
	none: "No Mod",
	ring: "Ring",
	noise: "Noise",
};

const MOD_COLORS: Record<ModulationType, string> = {
	none: "badge-ghost opacity-40",
	ring: "badge-warning",
	noise: "badge-error",
};

// ---------------------------------------------------------------------------
// Single waveform slot
// ---------------------------------------------------------------------------

const WaveformSlot: React.FC<{
	waveform: WaveformId | null;
	label: string;
	dim?: boolean;
}> = ({ waveform, label, dim }) => {
	if (!waveform) {
		return (
			<div
				className={`flex items-center gap-3 rounded-md px-3 py-2 border border-dashed border-base-content/10 w-full min-w-0 ${dim ? "opacity-30" : "opacity-60"}`}
			>
				<span className="text-[9px] font-mono text-base-content/40 uppercase tracking-widest shrink-0">
					{label}
				</span>
				<span className="text-xs text-base-content/20 ml-auto">—</span>
			</div>
		);
	}

	return (
		<div
			className={`flex items-center gap-3 rounded-md px-3 py-2 border border-base-content/20 bg-base-300/40 w-full min-w-0 transition-opacity ${dim ? "opacity-40" : "opacity-100"}`}
		>
			<span className="text-[9px] font-mono text-base-content/50 uppercase tracking-widest shrink-0">
				{label}
			</span>
			<WaveIcon id={waveform} size={24} />
			<span className="text-[10px] font-mono leading-tight text-base-content/70 text-right flex-1">
				{WF_NAMES[waveform]}
			</span>
		</div>
	);
};

// ---------------------------------------------------------------------------
// Main WaveformDisplay
// ---------------------------------------------------------------------------

interface WaveformDisplayProps {
	line: "DCO1" | "DCO2";
	config: WaveformConfig;
	disabled?: boolean;
}

const WaveformDisplay: React.FC<WaveformDisplayProps> = memo(
	({ line, config, disabled }) => {
		const hasSecondary = config.secondWaveform !== null;

		return (
			<div
				className={`flex flex-col gap-2 overflow-x-hidden ${disabled ? "opacity-40" : ""}`}
			>
				<div className="flex items-center justify-between">
					<span className="text-[10px] font-mono text-base-content/50 uppercase tracking-widest">
						{line}
					</span>
					<span className={`badge badge-xs ${MOD_COLORS[config.modulation]}`}>
						{MOD_LABELS[config.modulation]}
					</span>
				</div>
				<div className="grid items-start min-w-0 gap-1.5 grid-cols-1">
					<WaveformSlot waveform={config.firstWaveform} label="Primary" />
					{hasSecondary && (
						<WaveformSlot waveform={config.secondWaveform} label="Secondary" />
					)}
				</div>
			</div>
		);
	},
);

WaveformDisplay.displayName = "WaveformDisplay";

export default WaveformDisplay;
