import { memo } from "react";
import { algoParamTargetFromSlot } from "@/lib/synth/modDestination";
import ControlKnob from "../ControlKnob";
import type {
	AlgoControlBinding,
	AlgoControlRuntime,
	LineIndex,
} from "./algoControlTypes";

interface AlgoControlNumberProps {
	control: AlgoControlRuntime;
	disabled?: boolean;
	binding?: AlgoControlBinding;
	lineIndex: LineIndex;
	algoParamSlotIndex: Record<string, number>;
	getAlgoControlValue: (id: string, fallback: number) => number;
	setAlgoControlValue: (id: string, value: number) => void;
}

function AlgoControlNumberInner({
	control,
	disabled = false,
	binding,
	lineIndex,
	algoParamSlotIndex,
	getAlgoControlValue,
	setAlgoControlValue,
}: AlgoControlNumberProps) {
	const min = control.min ?? 0;
	const max = control.max ?? 1;
	const value =
		binding?.getNumber?.() ??
		getAlgoControlValue(control.id, control.default ?? min);
	const slotIdx = algoParamSlotIndex[control.id];
	const algoParamTarget = slotIdx
		? algoParamTargetFromSlot(slotIdx)
		: undefined;

	return (
		<div className="flex flex-col items-center">
			<ControlKnob
				label={control.label}
				tooltip={control.description ?? undefined}
				disabled={disabled}
				min={min}
				max={max}
				value={value}
				size={64}
				bipolar={min < 0 && max > 0}
				defaultValue={control.default ?? undefined}
				color="cyan"
				modulatable={disabled ? undefined : algoParamTarget}
				lineIndex={lineIndex}
				onChange={(newVal) =>
					binding?.setNumber
						? binding.setNumber(newVal)
						: setAlgoControlValue(control.id, newVal)
				}
				valueFormatter={(v) => v.toFixed(2)}
			/>
		</div>
	);
}

const AlgoControlNumber = memo(AlgoControlNumberInner);

export default AlgoControlNumber;
