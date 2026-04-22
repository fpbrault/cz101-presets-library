import { memo } from "react";
import AlgoControlNumber from "./AlgoControlNumber";
import AlgoControlSelect from "./AlgoControlSelect";
import AlgoControlToggle from "./AlgoControlToggle";
import type {
	AlgoControlBinding,
	AlgoControlOptionRuntime,
	AlgoControlRuntime,
	LineIndex,
} from "./algoControlTypes";

interface AlgoControlItemProps {
	control: AlgoControlRuntime;
	binding?: AlgoControlBinding;
	lineIndex: LineIndex;
	algoParamSlotIndex: Record<string, number>;
	getAlgoControlValue: (id: string, fallback: number) => number;
	setAlgoControlValue: (id: string, value: number) => void;
	getActiveSelectOption: (
		control: AlgoControlRuntime,
	) => AlgoControlOptionRuntime | null;
	applyOptionAssignments: (option: AlgoControlOptionRuntime) => void;
}

function AlgoControlItemInner({
	control,
	binding,
	lineIndex,
	algoParamSlotIndex,
	getAlgoControlValue,
	setAlgoControlValue,
	getActiveSelectOption,
	applyOptionAssignments,
}: AlgoControlItemProps) {
	const controlKind = control.kind ?? "number";

	if (controlKind === "select") {
		return (
			<AlgoControlSelect
				control={control}
				binding={binding}
				getActiveSelectOption={getActiveSelectOption}
				applyOptionAssignments={applyOptionAssignments}
			/>
		);
	}

	if (controlKind === "number") {
		return (
			<AlgoControlNumber
				control={control}
				binding={binding}
				lineIndex={lineIndex}
				algoParamSlotIndex={algoParamSlotIndex}
				getAlgoControlValue={getAlgoControlValue}
				setAlgoControlValue={setAlgoControlValue}
			/>
		);
	}

	return <AlgoControlToggle control={control} binding={binding} />;
}

const AlgoControlItem = memo(AlgoControlItemInner);

export default AlgoControlItem;
