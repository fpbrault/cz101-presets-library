import CzButton from "@/components/primitives/CzButton";
import { useSynthParam } from "@/features/synth/SynthParamController";

export default function ModModeControl() {
	const { value: modMode, setValue: setModMode } = useSynthParam("modMode");

	return (
		<div className="shrink-0">
			<div className="mb-1 cz-light-blue">Modulation</div>
			<div className="flex gap-1">
				{(
					[
						[
							"normal",
							"Normal",
							"Standard phase modulation behavior.",
						],
						[
							"ring",
							"Ring",
							"Enable ring modulation between lines.",
						],
						[
							"noise",
							"Noise",
							"Mix noise source into modulation path.",
						],
					] as const
				).map(([mode, label, tooltip]) => (
					<CzButton
						key={mode}
						active={modMode === mode}
						onClick={() => setModMode(mode)}
						tooltip={tooltip}
						className="flex-1"
					>
						{label}
					</CzButton>
				))}
			</div>
		</div>
	);
}
