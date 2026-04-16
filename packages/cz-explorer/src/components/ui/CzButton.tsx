import type React from "react";

type CzButtonProps = {
	active?: boolean;
	onClick?: () => void;
	children: React.ReactNode;
	className?: string;
	disabled?: boolean;
	type?: "button" | "submit" | "reset";
	led?: boolean; // whether to show the LED indicator above the button
	style?: React.CSSProperties;
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
}: CzButtonProps) {
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
							? "bg-cz-led-on shadow-[0_0_4px_1px_rgba(255,30,30,0.55),inset_0_1px_0_rgba(255,180,180,0.3)]"
							: "bg-cz-led-off shadow-[inset_0_1px_1px_rgba(0,0,0,0.6)]"
					}`}
					aria-hidden="true"
				/>
			) : (
				// Placeholder to keep buttons aligned when LED is disabled
				<span className="inline-block h-1 w-3 mb-1" aria-hidden="true" />
			)}
			{/* Button face */}
			<button
				type={type}
				disabled={disabled}
				onClick={onClick}
				className={`inline-flex h-5 w-8 items-center justify-center px-2 py-0.75 rounded-[3px] border cursor-pointer select-none transition-colors duration-75 shadow-[0_2px_0_#111,inset_0_1px_0_rgba(255,255,255,0.06)] active:shadow-[0_1px_0_#111,inset_0_1px_2px_rgba(0,0,0,0.4)] active:translate-y-px disabled:opacity-40 disabled:cursor-not-allowed ${
					active
						? "bg-cz-btn border-cz-btn-border text-cz-cream"
						: "bg-cz-btn border-cz-btn-border text-cz-cream-dim"
				}`}
			></button>
			<div className="font-mono text-[0.6rem] font-semibold uppercase tracking-[0.12em] ">
				{children}
			</div>
		</div>
	);
}
