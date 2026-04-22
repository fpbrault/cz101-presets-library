import { memo } from "react";
import AlgoControlTooltip from "./AlgoControlTooltip";
import type {
	AlgoControlBinding,
	AlgoControlRuntime,
} from "./algoControlTypes";

interface AlgoControlToggleProps {
	control: AlgoControlRuntime;
	binding?: AlgoControlBinding;
}

function AlgoControlToggleInner({ control, binding }: AlgoControlToggleProps) {
	const toggleValue = binding?.getToggle?.() ?? control.defaultToggle ?? false;

	return (
		<div className="flex items-center justify-between rounded-md bg-cz-inset/70 px-2 py-1.5">
			<div className="flex items-center gap-2">
				<span className="text-4xs uppercase tracking-[0.18em] text-cz-cream">
					{control.label}
				</span>
				<AlgoControlTooltip description={control.description} />
			</div>
			<input
				type="checkbox"
				checked={toggleValue}
				onChange={(event) => binding?.setToggle?.(event.target.checked)}
				disabled={!binding?.setToggle}
				className="checkbox checkbox-xs"
			/>
		</div>
	);
}

const AlgoControlToggle = memo(AlgoControlToggleInner);

export default AlgoControlToggle;
