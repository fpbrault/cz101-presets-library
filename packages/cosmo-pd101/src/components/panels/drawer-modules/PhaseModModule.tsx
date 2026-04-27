import { useState } from "react";
import ControlKnob from "@/components/controls/ControlKnob";
import CzButton from "@/components/primitives/CzButton";
import ModuleFrame from "@/components/primitives/ModuleFrame";
import { requestApplyModulePreset } from "@/features/synth/engine/modulePresetEvents";
import { useSynthParam } from "@/features/synth/SynthParamController";
import { PHASE_MOD_PRESETS } from "@/lib/synth/modulePresets";

export default function PhaseModModule() {
	const [selectedPreset, setSelectedPreset] = useState<string>("custom");
	const { value: phaseModEnabled, setValue: setPhaseModEnabled } =
		useSynthParam("phaseModEnabled");
	const { value: intPmAmount, setValue: setIntPmAmount } =
		useSynthParam("intPmAmount");
	const { value: intPmRatio, setValue: setIntPmRatio } =
		useSynthParam("intPmRatio");
	const { value: pmPre, setValue: setPmPre } = useSynthParam("pmPre");

	const handlePresetChange = (presetId: string) => {
		setSelectedPreset(presetId);
		if (presetId === "custom") {
			return;
		}

		const preset = PHASE_MOD_PRESETS.find((entry) => entry.id === presetId);
		if (!preset) {
			return;
		}

		setPhaseModEnabled(preset.patch.intPmEnabled);
		setIntPmAmount(preset.patch.intPmAmount);
		setIntPmRatio(preset.patch.intPmRatio);
		setPmPre(preset.patch.pmPre);
		requestApplyModulePreset({
			module: "phaseMod",
			preset: preset.id,
			patch: preset.patch,
		});
	};

	return (
		<ModuleFrame
			title="Phase Mod"
			color="#be3330"
			enabled={phaseModEnabled}
			columns={2}
			onToggle={() => setPhaseModEnabled(!phaseModEnabled)}
		>
			<select
				className="select select-bordered select-xs col-span-full"
				aria-label="Phase mod preset"
				value={selectedPreset}
				onChange={(event) => handlePresetChange(event.target.value)}
			>
				<option value="custom">Custom</option>
				{PHASE_MOD_PRESETS.map((preset) => (
					<option key={preset.id} value={preset.id}>
						{preset.label}
					</option>
				))}
			</select>
			<CzButton
				active={pmPre}
				onClick={() => setPmPre(!pmPre)}
				className="h-16 px-2 col-span-2"
			>
				Pre
			</CzButton>

			<ControlKnob
				value={intPmAmount}
				onChange={setIntPmAmount}
				min={0}
				max={0.3}
				defaultValue={0.03}
				size={52}
				color="#be3330"
				label="Amount"
				valueFormatter={(value) => value.toFixed(2)}
			/>
			<ControlKnob
				value={intPmRatio}
				onChange={setIntPmRatio}
				min={0.5}
				max={4}
				defaultValue={1.0}
				size={52}
				color="#be3330"
				label="Ratio"
				valueFormatter={(value) => value.toFixed(1)}
			/>
		</ModuleFrame>
	);
}
