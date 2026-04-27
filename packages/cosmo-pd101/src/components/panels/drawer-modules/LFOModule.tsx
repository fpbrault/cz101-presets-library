import { useState } from "react";
import ControlKnob from "@/components/controls/ControlKnob";
import CompactButton from "@/components/primitives/CompactButton";
import ModuleFrame from "@/components/primitives/ModuleFrame";
import { requestApplyModulePreset } from "@/features/synth/engine/modulePresetEvents";
import { useSynthParam } from "@/features/synth/SynthParamController";
import { getLfoModulePatch, LFO_PRESETS } from "@/lib/synth/modulePresets";

interface LfoModuleProps {
	id: 1 | 2;
	color: string;
}

export default function LfoModule({ id, color }: LfoModuleProps) {
	const [selectedPreset, setSelectedPreset] = useState<string>("custom");
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

	const handlePresetChange = (presetId: string) => {
		setSelectedPreset(presetId);
		if (presetId === "custom") {
			return;
		}

		const preset = LFO_PRESETS.find((entry) => entry.id === presetId);
		if (!preset) {
			return;
		}

		setLfoWaveform(preset.patch.waveform);
		setLfoRate(preset.patch.rate);
		setLfoDepth(preset.patch.depth);
		setLfoSymmetry(preset.patch.symmetry);
		setLfoRetrigger(preset.patch.retrigger);
		setLfoOffset(preset.patch.offset);
		requestApplyModulePreset({
			module: id === 1 ? "lfo1" : "lfo2",
			preset: preset.id,
			patch: getLfoModulePatch(id, preset.patch),
		});
	};

	return (
		<ModuleFrame title={`LFO ${id}`} color={color} showLed={false} enabled>
			<select
				className="select select-bordered select-xs col-span-full"
				aria-label={`LFO ${id} preset`}
				value={selectedPreset}
				onChange={(event) => handlePresetChange(event.target.value)}
			>
				<option value="custom">Custom</option>
				{LFO_PRESETS.map((preset) => (
					<option key={preset.id} value={preset.id}>
						{preset.label}
					</option>
				))}
			</select>
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
