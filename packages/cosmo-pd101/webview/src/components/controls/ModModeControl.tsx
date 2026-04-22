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
						["normal", "Normal"],
						["ring", "Ring"],
						["noise", "Noise"],
					] as const
				).map(([mode, label]) => (
					<CzButton
						key={mode}
						active={modMode === mode}
						onClick={() => setModMode(mode)}
						className="flex-1"
					>
						{label}
					</CzButton>
				))}
			</div>
		</div>
	);
}
