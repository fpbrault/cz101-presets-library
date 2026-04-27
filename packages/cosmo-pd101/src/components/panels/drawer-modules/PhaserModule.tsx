import { useState } from "react";
import ControlKnob from "@/components/controls/ControlKnob";
import ModuleFrame from "@/components/primitives/ModuleFrame";
import { requestApplyModulePreset } from "@/features/synth/engine/modulePresetEvents";
import { useSynthParam } from "@/features/synth/SynthParamController";
import { PHASER_PRESETS } from "@/lib/synth/modulePresets";

export default function PhaserModule() {
	const [selectedPreset, setSelectedPreset] = useState<string>("custom");
	const { value: phaserEnabled, setValue: setPhaserEnabled } =
		useSynthParam("phaserEnabled");
	const { value: phaserRate, setValue: setPhaserRate } =
		useSynthParam("phaserRate");
	const { value: phaserDepth, setValue: setPhaserDepth } =
		useSynthParam("phaserDepth");
	const { value: phaserFeedback, setValue: setPhaserFeedback } =
		useSynthParam("phaserFeedback");
	const { value: phaserMix, setValue: setPhaserMix } =
		useSynthParam("phaserMix");

	const handlePresetChange = (presetId: string) => {
		setSelectedPreset(presetId);
		if (presetId === "custom") {
			return;
		}

		const preset = PHASER_PRESETS.find((entry) => entry.id === presetId);
		if (!preset) {
			return;
		}

		setPhaserEnabled(preset.patch.phaser.enabled);
		setPhaserRate(preset.patch.phaser.rate);
		setPhaserDepth(preset.patch.phaser.depth);
		setPhaserFeedback(preset.patch.phaser.feedback);
		setPhaserMix(preset.patch.phaser.mix);
		requestApplyModulePreset({
			module: "phaser",
			preset: preset.id,
			patch: preset.patch,
		});
	};

	return (
		<ModuleFrame
			title="Phaser"
			color="#a78bfa"
			meta="4-Stage"
			enabled={phaserEnabled}
			onToggle={() => setPhaserEnabled(!phaserEnabled)}
		>
			<select
				className="select select-bordered select-xs col-span-full"
				aria-label="Phaser preset"
				value={selectedPreset}
				onChange={(event) => handlePresetChange(event.target.value)}
			>
				<option value="custom">Custom</option>
				{PHASER_PRESETS.map((preset) => (
					<option key={preset.id} value={preset.id}>
						{preset.label}
					</option>
				))}
			</select>
			<ControlKnob
				value={phaserRate}
				onChange={setPhaserRate}
				min={0.1}
				max={10}
				defaultValue={0.5}
				size={52}
				color="#a78bfa"
				label="Rate"
				valueFormatter={(value) => `${value.toFixed(1)}Hz`}
			/>
			<ControlKnob
				value={phaserDepth}
				onChange={setPhaserDepth}
				min={0}
				max={1}
				defaultValue={1.0}
				size={52}
				color="#a78bfa"
				label="Depth"
				valueFormatter={(value) => `${Math.round(value * 100)}%`}
			/>
			<ControlKnob
				value={phaserFeedback}
				onChange={setPhaserFeedback}
				min={-0.9}
				max={0.9}
				defaultValue={0.5}
				size={52}
				color="#a78bfa"
				label="Fdbk"
				valueFormatter={(value) =>
					value >= 0
						? `+${Math.round(value * 100)}%`
						: `${Math.round(value * 100)}%`
				}
			/>
			<ControlKnob
				value={phaserMix}
				onChange={setPhaserMix}
				min={0}
				max={1}
				defaultValue={0.5}
				size={52}
				color="#a78bfa"
				label="Mix"
				valueFormatter={(value) => `${Math.round(value * 100)}%`}
			/>
		</ModuleFrame>
	);
}
