import { useState } from "react";
import ControlKnob from "@/components/controls/ControlKnob";
import CompactButton from "@/components/primitives/CompactButton";
import ModuleFrame from "@/components/primitives/ModuleFrame";
import { requestApplyModulePreset } from "@/features/synth/engine/modulePresetEvents";
import { useSynthParam } from "@/features/synth/SynthParamController";
import { VIBRATO_PRESETS } from "@/lib/synth/modulePresets";

export default function VibratoModule() {
	const [selectedPreset, setSelectedPreset] = useState<string>("custom");
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

	const handlePresetChange = (presetId: string) => {
		setSelectedPreset(presetId);
		if (presetId === "custom") {
			return;
		}

		const preset = VIBRATO_PRESETS.find((entry) => entry.id === presetId);
		if (!preset) {
			return;
		}

		setVibratoEnabled(preset.patch.vibrato.enabled);
		setVibratoWave(preset.patch.vibrato.waveform);
		setVibratoRate(preset.patch.vibrato.rate);
		setVibratoDepth(preset.patch.vibrato.depth);
		setVibratoDelay(preset.patch.vibrato.delay);
		requestApplyModulePreset({
			module: "vibrato",
			preset: preset.id,
			patch: preset.patch,
		});
	};

	return (
		<ModuleFrame
			title="Vibrato"
			color="#307948"
			enabled={vibratoEnabled}
			columns={3}
			onToggle={() => setVibratoEnabled(!vibratoEnabled)}
		>
			<select
				className="select select-bordered select-xs col-span-full"
				aria-label="Vibrato preset"
				value={selectedPreset}
				onChange={(event) => handlePresetChange(event.target.value)}
			>
				<option value="custom">Custom</option>
				{VIBRATO_PRESETS.map((preset) => (
					<option key={preset.id} value={preset.id}>
						{preset.label}
					</option>
				))}
			</select>
			<div className="grid grid-cols-4 gap-1 w-full col-span-3">
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
			<ControlKnob
				value={vibratoRate}
				onChange={setVibratoRate}
				min={0}
				max={99}
				defaultValue={65}
				size={52}
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
				size={52}
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
				size={52}
				color="#307948"
				label="Delay"
				valueFormatter={(v) => `${Math.round(v)}ms`}
			/>
		</ModuleFrame>
	);
}
