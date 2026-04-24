import type React from "react";
import { useHoverInfo } from "../layout/HoverInfo";

type CzButtonProps = {
	active?: boolean;
	onClick?: () => void;
	children: React.ReactNode;
	className?: string;
	disabled?: boolean;
	type?: "button" | "submit" | "reset";
	led?: boolean; // whether to show the LED indicator above the button
	style?: React.CSSProperties;
	tooltip?: string;
};

/**
 * CZ-101 hardware-style selector button.
 * LED indicator sits above the button body; label text is on the button face.
 *
 * Structure:
 *   <div>          ← wrapper (flex col, items-center)
 *     <span>       ← LED dot (red when active, dim when inactive)
 *     <button>     ← button face with label text only
 *   </div>
 */
export default function CzButton({
	active = false,
	onClick,
	children,
	className = "",
	disabled = false,
	type = "button",
	led = true,
	style,
	tooltip,
}: CzButtonProps) {
	const { setHoverInfo, clearHoverInfo } = useHoverInfo();
	const hoverHandlers = tooltip
		? {
			onPointerEnter: () => setHoverInfo(tooltip),
			onPointerLeave: clearHoverInfo,
			onFocus: () => setHoverInfo(tooltip),
			onBlur: clearHoverInfo,
		}
		: undefined;

	const buttonFace = (
		<button
			type={type}
			disabled={disabled}
			onClick={onClick}
			data-hover-info={tooltip}
			{...hoverHandlers}
			className={`inline-flex h-5 w-8 items-center justify-center px-2 py-0.75 rounded-[3px] border cursor-pointer select-none transition-colors duration-75 shadow-sm active:shadow-inner active:translate-y-px disabled:opacity-40 disabled:cursor-not-allowed ${
				active
					? "bg-cz-btn border-cz-btn-border text-cz-cream"
					: "bg-cz-btn border-cz-btn-border text-cz-cream-dim"
			}`}
		></button>
	);

	return (
		<div
			className={`flex flex-col items-center gap-1 ${className}`}
			style={style}
		>
			{/* LED above the button */}
			{led ? (
				<span
					className={`inline-block h-1 w-3 mb-1 rounded-[1px] transition-all duration-75 ${
						active
							? "bg-cz-led-on shadow-sm"
							: "bg-cz-led-off shadow-inner"
					}`}
					aria-hidden="true"
				/>
			) : (
				// Placeholder to keep buttons aligned when LED is disabled
				<span className="inline-block h-1 w-3 mb-1" aria-hidden="true" />
			)}
			{/* Button face */}
			{buttonFace}
			<div className="font-mono text-[0.6rem] font-semibold uppercase tracking-[0.12em] ">
				{children}
			</div>
		</div>
	);
}
