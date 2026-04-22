import CzButton from "@/components/primitives/CzButton";
import { useSynthParam } from "@/features/synth/SynthParamController";

export default function LineSelectControl() {
	const { value: lineSelect, setValue: setLineSelect } =
		useSynthParam("lineSelect");

	return (
		<div className="shrink-0">
			<div className="mb-1 cz-light-blue">Line Select</div>
			<div className="grid grid-cols-5 gap-1">
				{(["L1", "L1+L2", "L2", "L1+L1'", "L1+L2'"] as const).map((ls) => (
					<CzButton
						key={ls}
						active={lineSelect === ls}
						onClick={() => setLineSelect(ls)}
					>
						{ls}
					</CzButton>
				))}
			</div>
		</div>
	);
}
