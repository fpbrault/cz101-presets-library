import { memo } from "react";
import type {
	AlgoControlBinding,
	AlgoControlOptionRuntime,
	AlgoControlRuntime,
} from "./algoControlTypes";

interface AlgoControlDropdownProps {
	control: AlgoControlRuntime;
	disabled?: boolean;
	binding?: AlgoControlBinding;
	getActiveSelectOption: (
		control: AlgoControlRuntime,
	) => AlgoControlOptionRuntime | null;
	applyOptionAssignments: (option: AlgoControlOptionRuntime) => void;
}

function AlgoControlDropdownInner({
	control,
	disabled = false,
	binding,
	getActiveSelectOption,
	applyOptionAssignments,
}: AlgoControlDropdownProps) {
	const options = control.options ?? [];
	const activeOption = getActiveSelectOption(control);
	const selectedValue = activeOption?.value ?? options[0]?.value ?? "";

	return (
		<div className="grid grid-rows-[2.15rem_auto] gap-1.5">
			<div className="flex items-end text-3xs uppercase tracking-[0.2em] leading-tight text-cz-cream/85">
				{control.label}
			</div>
			<select
				className="select select-bordered select-xs w-full"
				disabled={disabled}
				value={selectedValue}
				onChange={(event) => {
					if (disabled) {
						return;
					}

					const nextOption = options.find(
						(option) => option.value === event.target.value,
					);
					if (!nextOption) {
						return;
					}

					if (nextOption.set.length > 0) {
						applyOptionAssignments(nextOption);
						return;
					}

					const selectedIndex = options.findIndex(
						(option) => option.value === nextOption.value,
					);
					if (selectedIndex >= 0) {
						binding?.setNumber?.(selectedIndex);
					}
				}}
			>
				{options.map((option) => (
					<option key={option.value} value={option.value}>
						{option.label}
					</option>
				))}
			</select>
		</div>
	);
}

const AlgoControlDropdown = memo(AlgoControlDropdownInner);

export default AlgoControlDropdown;
