import { memo } from "react";
import {
	useHoverInfo,
	useHoverInfoHandlers,
} from "@/components/layout/HoverInfo";
import AlgoControlTooltip from "./AlgoControlTooltip";
import type {
	AlgoControlBinding,
	AlgoControlRuntime,
} from "./algoControlTypes";

interface AlgoControlToggleProps {
	control: AlgoControlRuntime;
	disabled?: boolean;
	binding?: AlgoControlBinding;
}

function AlgoControlToggleInner({
	control,
	disabled = false,
	binding,
}: AlgoControlToggleProps) {
	const { setControlReadout } = useHoverInfo();
	const toggleValue = binding?.getToggle?.() ?? control.defaultToggle ?? false;
	const hoverHandlers = useHoverInfoHandlers(
		control.description ?? control.label,
	);

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
				onChange={(event) => {
					const nextValue = event.target.checked;
					setControlReadout({
						label: control.label,
						value: nextValue ? "ON" : "OFF",
					});
					binding?.setToggle?.(nextValue);
				}}
				data-hover-info={control.description ?? control.label}
				{...hoverHandlers}
				disabled={disabled || !binding?.setToggle}
				className="checkbox checkbox-xs"
			/>
		</div>
	);
}

const AlgoControlToggle = memo(AlgoControlToggleInner);

export default AlgoControlToggle;
