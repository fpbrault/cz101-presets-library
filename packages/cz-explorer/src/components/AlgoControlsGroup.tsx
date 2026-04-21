import { memo } from "react";
import AlgoControlItem from "./AlgoControlItem";
import type {
	AlgoControlBinding,
	AlgoControlOptionRuntime,
	AlgoControlRuntime,
	LineIndex,
} from "./algoControlTypes";
import Card from "./ui/Card";

interface AlgoControlsGroupProps {
	controls: AlgoControlRuntime[];
	controlBindings: Record<string, AlgoControlBinding>;
	lineIndex: LineIndex;
	algoParamSlotIndex: Record<string, number>;
	getAlgoControlValue: (id: string, fallback: number) => number;
	setAlgoControlValue: (id: string, value: number) => void;
	getActiveSelectOption: (
		control: AlgoControlRuntime,
	) => AlgoControlOptionRuntime | null;
	applyOptionAssignments: (option: AlgoControlOptionRuntime) => void;
}

function AlgoControlsGroupInner({
	controls,
	controlBindings,
	lineIndex,
	algoParamSlotIndex,
	getAlgoControlValue,
	setAlgoControlValue,
	getActiveSelectOption,
	applyOptionAssignments,
}: AlgoControlsGroupProps) {
	return (
		<Card variant="subtle" className="p-3 min-h-0 flex flex-col col-span-2">
			<div className="mb-3 text-3xs uppercase tracking-[0.24em] text-cz-cream">
				Algo Controls
			</div>
			{controls.length > 0 ? (
				<div className="flex-1 flex flex-wrap gap-8 justify-center min-h-0 space-y-3 overflow-visible">
					{controls.map((control) => (
						<AlgoControlItem
							key={control.id}
							control={control}
							binding={controlBindings[control.id]}
							lineIndex={lineIndex}
							algoParamSlotIndex={algoParamSlotIndex}
							getAlgoControlValue={getAlgoControlValue}
							setAlgoControlValue={setAlgoControlValue}
							getActiveSelectOption={getActiveSelectOption}
							applyOptionAssignments={applyOptionAssignments}
						/>
					))}
				</div>
			) : (
				<div className="text-3xs text-cz-cream/70 uppercase tracking-[0.2em]">
					No controls for this algo
				</div>
			)}
		</Card>
	);
}

const AlgoControlsGroup = memo(AlgoControlsGroupInner);

export default AlgoControlsGroup;
