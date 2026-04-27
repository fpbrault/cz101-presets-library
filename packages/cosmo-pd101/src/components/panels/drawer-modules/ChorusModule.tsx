import { useState } from "react";
import ControlKnob from "@/components/controls/ControlKnob";
import ModuleFrame from "@/components/primitives/ModuleFrame";
import { requestApplyModulePreset } from "@/features/synth/engine/modulePresetEvents";
import { useSynthParam } from "@/features/synth/SynthParamController";
import { CHORUS_PRESETS } from "@/lib/synth/modulePresets";

export default function ChorusModule() {
	const [selectedPreset, setSelectedPreset] = useState<string>("custom");
	const { value: chorusEnabled, setValue: setChorusEnabled } =
		useSynthParam("chorusEnabled");
	const { value: chorusRate, setValue: setChorusRate } =
		useSynthParam("chorusRate");
	const { value: chorusDepth, setValue: setChorusDepth } =
		useSynthParam("chorusDepth");
	const { value: chorusMix, setValue: setChorusMix } =
		useSynthParam("chorusMix");

	const handlePresetChange = (presetId: string) => {
		setSelectedPreset(presetId);
		if (presetId === "custom") {
			return;
		}

		const preset = CHORUS_PRESETS.find((entry) => entry.id === presetId);
		if (!preset) {
			return;
		}

		setChorusEnabled(preset.patch.chorus.enabled);
		setChorusRate(preset.patch.chorus.rate);
		setChorusDepth(preset.patch.chorus.depth);
		setChorusMix(preset.patch.chorus.mix);
		requestApplyModulePreset({
			module: "chorus",
			preset: preset.id,
			patch: preset.patch,
		});
	};

	return (
		<ModuleFrame
			title="Chorus"
			color="#818cf8"
			columns={3}
			meta="Stereo"
			enabled={chorusEnabled}
			onToggle={() => setChorusEnabled(!chorusEnabled)}
		>
			<select
				className="select select-bordered select-xs col-span-full"
				aria-label="Chorus preset"
				value={selectedPreset}
				onChange={(event) => handlePresetChange(event.target.value)}
			>
				<option value="custom">Custom</option>
				{CHORUS_PRESETS.map((preset) => (
					<option key={preset.id} value={preset.id}>
						{preset.label}
					</option>
				))}
			</select>
			<ControlKnob
				value={chorusRate}
				onChange={setChorusRate}
				min={0.1}
				max={5}
				defaultValue={1.0}
				size={52}
				color="#818cf8"
				label="Rate"
				valueFormatter={(value) => value.toFixed(1)}
			/>
			<ControlKnob
				value={chorusDepth}
				onChange={setChorusDepth}
				min={0}
				max={3}
				defaultValue={1.5}
				size={52}
				color="#818cf8"
				label="Depth"
				valueFormatter={(value) => `${Math.round((value / 3) * 100)}%`}
			/>
			<ControlKnob
				value={chorusMix}
				onChange={setChorusMix}
				min={0}
				max={1}
				defaultValue={0.5}
				size={52}
				color="#818cf8"
				label="Mix"
				valueFormatter={(value) => `${Math.round(value * 100)}%`}
			/>
		</ModuleFrame>
	);
}
