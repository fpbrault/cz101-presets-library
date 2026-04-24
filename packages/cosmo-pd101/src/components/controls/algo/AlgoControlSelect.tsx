import { memo } from "react";
import CzButton from "@/components/primitives/CzButton";
import type {
	AlgoControlBinding,
	AlgoControlOptionRuntime,
	AlgoControlRuntime,
} from "./algoControlTypes";

interface AlgoControlSelectProps {
	control: AlgoControlRuntime;
	disabled?: boolean;
	binding?: AlgoControlBinding;
	getActiveSelectOption: (
		control: AlgoControlRuntime,
	) => AlgoControlOptionRuntime | null;
	applyOptionAssignments: (option: AlgoControlOptionRuntime) => void;
}

function AlgoControlSelectInner({
	control,
	disabled = false,
	binding,
	getActiveSelectOption,
	applyOptionAssignments,
}: AlgoControlSelectProps) {
	const options = control.options ?? [];
	const activeOption = getActiveSelectOption(control);
	const buttonTooltip = control.description
		? `${control.label}: ${control.description}`
		: control.label;

	return (
		<div className="space-y-1.5">
			<div className="grid grid-cols-4 gap-1.5">
				{options.map((option, index) => (
					<CzButton
						key={option.value}
						active={activeOption?.value === option.value}
						disabled={disabled}
						led={false}
						tooltip={buttonTooltip}
						onClick={() => {
							if (disabled) {
								return;
							}
							if (option.set.length > 0) {
								applyOptionAssignments(option);
								return;
							}
							binding?.setNumber?.(index);
						}}
						className="[&_button]:w-full"
					>
						{option.label}
					</CzButton>
				))}
			</div>
		</div>
	);
}

const AlgoControlSelect = memo(AlgoControlSelectInner);

export default AlgoControlSelect;
