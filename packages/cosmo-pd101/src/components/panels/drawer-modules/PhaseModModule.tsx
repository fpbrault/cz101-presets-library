import ControlKnob from "@/components/controls/ControlKnob";
import CzButton from "@/components/primitives/CzButton";
import ModuleFrame from "@/components/primitives/ModuleFrame";
import { useSynthParam } from "@/features/synth/SynthParamController";

export default function PhaseModModule() {
	const { value: phaseModEnabled, setValue: setPhaseModEnabled } =
		useSynthParam("phaseModEnabled");
	const { value: intPmAmount, setValue: setIntPmAmount } =
		useSynthParam("intPmAmount");
	const { value: intPmRatio, setValue: setIntPmRatio } =
		useSynthParam("intPmRatio");
	const { value: pmPre, setValue: setPmPre } = useSynthParam("pmPre");

	return (
		<ModuleFrame
			title="Phase Mod"
			color="#be3330"
			enabled={phaseModEnabled}
			columns={2}
			onToggle={() => setPhaseModEnabled(!phaseModEnabled)}
		>
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
