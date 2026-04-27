import { useState } from "react";
import ControlKnob from "@/components/controls/ControlKnob";
import ModuleFrame from "@/components/primitives/ModuleFrame";
import { requestApplyModulePreset } from "@/features/synth/engine/modulePresetEvents";
import { useSynthParam } from "@/features/synth/SynthParamController";
import { REVERB_PRESETS } from "@/lib/synth/modulePresets";

export default function ReverbModule() {
	const [selectedPreset, setSelectedPreset] = useState<string>("custom");
	const { value: reverbEnabled, setValue: setReverbEnabled } =
		useSynthParam("reverbEnabled");
	const { value: reverbSpace, setValue: setReverbSpace } =
		useSynthParam("reverbSpace");
	const { value: reverbPredelay, setValue: setReverbPredelay } =
		useSynthParam("reverbPredelay");
	const { value: reverbDistance, setValue: setReverbDistance } =
		useSynthParam("reverbDistance");
	const { value: reverbCharacter, setValue: setReverbCharacter } =
		useSynthParam("reverbCharacter");
	const { value: reverbMix, setValue: setReverbMix } =
		useSynthParam("reverbMix");

	const handlePresetChange = (presetId: string) => {
		setSelectedPreset(presetId);
		if (presetId === "custom") {
			return;
		}

		const preset = REVERB_PRESETS.find((entry) => entry.id === presetId);
		if (!preset) {
			return;
		}

		setReverbEnabled(preset.patch.reverb.enabled);
		setReverbMix(preset.patch.reverb.mix);
		setReverbSpace(preset.patch.reverb.space);
		setReverbPredelay(preset.patch.reverb.predelay);
		setReverbDistance(preset.patch.reverb.distance);
		setReverbCharacter(preset.patch.reverb.character);
		requestApplyModulePreset({
			module: "reverb",
			preset: preset.id,
			patch: preset.patch,
		});
	};
	return (
		<ModuleFrame
			title="Reverb"
			color="#f97316"
			columns={3}
			meta="FDN"
			enabled={reverbEnabled}
			onToggle={() => setReverbEnabled(!reverbEnabled)}
		>
			<select
				className="select select-bordered select-xs col-span-full"
				aria-label="Reverb preset"
				value={selectedPreset}
				onChange={(event) => handlePresetChange(event.target.value)}
			>
				<option value="custom">Custom</option>
				{REVERB_PRESETS.map((preset) => (
					<option key={preset.id} value={preset.id}>
						{preset.label}
					</option>
				))}
			</select>
			<ControlKnob
				value={reverbSpace}
				onChange={setReverbSpace}
				min={0}
				max={1}
				defaultValue={0.5}
				size={48}
				color="#f97316"
				label="Space"
				valueFormatter={(value) => `${Math.round(value * 100)}%`}
			/>
			<ControlKnob
				value={reverbPredelay}
				onChange={setReverbPredelay}
				min={0}
				max={0.1}
				defaultValue={0}
				size={48}
				color="#f97316"
				label="Pre-Dly"
				valueFormatter={(value) => `${Math.round(value * 1000)}ms`}
			/>
			<ControlKnob
				value={reverbDistance}
				onChange={setReverbDistance}
				min={0}
				max={1}
				defaultValue={0.3}
				size={48}
				color="#f97316"
				label="Dist"
				valueFormatter={(value) => `${Math.round(value * 100)}%`}
			/>
			<ControlKnob
				value={reverbCharacter}
				onChange={setReverbCharacter}
				min={0}
				max={1}
				defaultValue={0.65}
				size={48}
				color="#f97316"
				label="Character"
				valueFormatter={(value) => `${Math.round(value * 100)}%`}
			/>
			<ControlKnob
				value={reverbMix}
				onChange={setReverbMix}
				min={0}
				max={1}
				defaultValue={0.3}
				size={48}
				color="#f97316"
				label="Mix"
				valueFormatter={(value) => `${Math.round(value * 100)}%`}
			/>
		</ModuleFrame>
	);
}
