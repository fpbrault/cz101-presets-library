import ControlKnob from "@/components/controls/ControlKnob";
import CompactButton from "@/components/primitives/CompactButton";
import ModuleFrame from "@/components/primitives/ModuleFrame";
import { useSynthParam } from "@/features/synth/SynthParamController";

interface LfoModuleProps {
	id: 1 | 2;
	color: string;
}

export default function LfoModule({ id, color }: LfoModuleProps) {
	// Dynamically resolve the parameter names based on the LFO id
	const prefix = id === 1 ? "lfo" : "lfo2";

	const { value: lfoWaveform, setValue: setLfoWaveform } = useSynthParam(
		`${prefix}Waveform`,
	);
	const { value: lfoRate, setValue: setLfoRate } = useSynthParam(
		`${prefix}Rate`,
	);
	const { value: lfoDepth, setValue: setLfoDepth } = useSynthParam(
		`${prefix}Depth`,
	);
	const { value: lfoSymmetry, setValue: setLfoSymmetry } = useSynthParam(
		`${prefix}Symmetry`,
	);
	const { value: lfoRetrigger, setValue: setLfoRetrigger } = useSynthParam(
		`${prefix}Retrigger`,
	);
	const { value: lfoOffset, setValue: setLfoOffset } = useSynthParam(
		`${prefix}Offset`,
	);

	return (
		<ModuleFrame title={`LFO ${id}`} color={color} showLed={false} enabled>
			<div className="grid grid-cols-3 justify-center col-span-4 gap-1">
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
						className="grow"
						active={lfoWaveform === w}
						onClick={() => setLfoWaveform(w)}
					>
						{label}
					</CompactButton>
				))}
			</div>
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
			<CompactButton
				active={lfoRetrigger}
				onClick={() => setLfoRetrigger(!lfoRetrigger)}
				className="px-2 col-span-4 w-fit justify-self-center"
			>
				Retrig
			</CompactButton>
		</ModuleFrame>
	);
}
