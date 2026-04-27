import { useState } from "react";
import ControlKnob from "@/components/controls/ControlKnob";
import ModuleFrame from "@/components/primitives/ModuleFrame";
import { requestApplyModulePreset } from "@/features/synth/engine/modulePresetEvents";
import { useSynthParam } from "@/features/synth/SynthParamController";
import { MOD_ENV_PRESETS } from "@/lib/synth/modulePresets";

export default function ModEnveloppeModule() {
	const [selectedPreset, setSelectedPreset] = useState<string>("custom");
	const { value: modEnvAttack, setValue: setModEnvAttack } =
		useSynthParam("modEnvAttack");
	const { value: modEnvDecay, setValue: setModEnvDecay } =
		useSynthParam("modEnvDecay");
	const { value: modEnvSustain, setValue: setModEnvSustain } =
		useSynthParam("modEnvSustain");
	const { value: modEnvRelease, setValue: setModEnvRelease } =
		useSynthParam("modEnvRelease");

	const handlePresetChange = (presetId: string) => {
		setSelectedPreset(presetId);
		if (presetId === "custom") {
			return;
		}

		const preset = MOD_ENV_PRESETS.find((entry) => entry.id === presetId);
		if (!preset) {
			return;
		}

		setModEnvAttack(preset.patch.modEnv.attack);
		setModEnvDecay(preset.patch.modEnv.decay);
		setModEnvSustain(preset.patch.modEnv.sustain);
		setModEnvRelease(preset.patch.modEnv.release);
		requestApplyModulePreset({
			module: "modEnv",
			preset: preset.id,
			patch: preset.patch,
		});
	};

	return (
		<ModuleFrame title="Mod Env" color="#c24587" enabled showLed={false}>
			<select
				className="select select-bordered select-xs col-span-full"
				aria-label="Mod env preset"
				value={selectedPreset}
				onChange={(event) => handlePresetChange(event.target.value)}
			>
				<option value="custom">Custom</option>
				{MOD_ENV_PRESETS.map((preset) => (
					<option key={preset.id} value={preset.id}>
						{preset.label}
					</option>
				))}
			</select>
			<ControlKnob
				value={modEnvAttack}
				onChange={setModEnvAttack}
				min={0}
				max={10}
				defaultValue={0.01}
				size={52}
				color="#c24587"
				label="Atk"
				valueFormatter={(v) => `${v.toFixed(2)}s`}
			/>
			<ControlKnob
				value={modEnvDecay}
				onChange={setModEnvDecay}
				min={0}
				max={10}
				defaultValue={0.1}
				size={52}
				color="#c24587"
				label="Dec"
				valueFormatter={(v) => `${v.toFixed(2)}s`}
			/>
			<ControlKnob
				value={modEnvSustain}
				onChange={setModEnvSustain}
				min={0}
				max={1}
				defaultValue={0.5}
				size={52}
				color="#c24587"
				label="Sus"
				valueFormatter={(v) => `${Math.round(v * 100)}%`}
			/>
			<ControlKnob
				value={modEnvRelease}
				onChange={setModEnvRelease}
				min={0}
				max={10}
				defaultValue={0.2}
				size={52}
				color="#c24587"
				label="Rel"
				valueFormatter={(v) => `${v.toFixed(2)}s`}
			/>
		</ModuleFrame>
	);
}
