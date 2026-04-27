import CzButton from "@/components/primitives/CzButton";
import { useSynthParam } from "@/features/synth/SynthParamController";

export default function LineSelectControl() {
	const { value: lineSelect, setValue: setLineSelect } =
		useSynthParam("lineSelect");
	const lineSelectTooltips: Record<string, string> = {
		L1: "Play oscillator line 1 only.",
		"L1+L2": "Layer oscillator lines 1 and 2.",
		L2: "Play oscillator line 2 only.",
		"L1+L1'": "Stack line 1 with a detuned variant.",
		"L1+L2'": "Layer line 1 with a detuned line 2 variant.",
	};

	return (
		<div className="shrink-0">
			<div className="mb-1 cz-light-blue">Line Select</div>
			<div className="grid grid-cols-5 gap-1">
				{(["L1", "L1+L2", "L2", "L1+L1'", "L1+L2'"] as const).map((ls) => (
					<CzButton
						key={ls}
						active={lineSelect === ls}
						tooltip={lineSelectTooltips[ls]}
						onClick={() => setLineSelect(ls)}
					>
						{ls}
					</CzButton>
				))}
			</div>
		</div>
	);
}
