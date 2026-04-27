import { motion } from "motion/react";
import type React from "react";
import { useHoverInfoHandlers } from "../layout/HoverInfo";

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
	const resolvedTooltip = tooltip?.trim() ? tooltip : undefined;
	const hoverHandlers = useHoverInfoHandlers(resolvedTooltip);

	const buttonFace = (
		<motion.button
			type={type}
			disabled={disabled}
			onClick={onClick}
			data-hover-info={resolvedTooltip}
			{...hoverHandlers}
			initial={{
				boxShadow:
					"0 3px 0 rgba(0,0,0,0.6), 0 4px 6px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.1)",
				y: 0,
			}}
			whileTap={
				disabled
					? undefined
					: {
							boxShadow:
								"0 1px 0 rgba(0,0,0,0.6), 0 1px 3px rgba(0,0,0,0.25), inset 0 0px 0px rgba(0,0,0,0)",
							y: 2,
						}
			}
			whileHover={disabled ? undefined : { y: -1 }}
			transition={{ duration: 0.08, ease: "easeOut" }}
			className={`inline-flex h-5 w-8 items-center justify-center px-2 py-0.75 rounded-[3px] border cursor-pointer select-none disabled:opacity-40 disabled:cursor-not-allowed bg-cz-btn border-cz-btn-border ${
				active ? "text-cz-cream" : "text-cz-cream-dim"
			}`}
		/>
	);

	return (
		<div
			className={`flex flex-col items-center gap-1 ${className}`}
			style={style}
		>
			{/* LED above the button */}
			{led ? (
				<motion.span
					animate={
						active
							? {
									backgroundColor: "var(--color-cz-led-on, #ff3b3b)",
									boxShadow:
										"0 0 5px 2px rgba(255,50,50,0.7), inset 0 1px 0 rgba(255,160,160,0.25)",
									scaleX: 1.18,
								}
							: {
									backgroundColor: "var(--color-cz-led-off, #3a1a1a)",
									boxShadow: "inset 0 1px 3px rgba(0,0,0,0.7)",
									scaleX: 1,
								}
					}
					transition={{
						backgroundColor: { duration: 0.05 },
						scaleX: { type: "spring", stiffness: 900, damping: 16 },
						boxShadow: { duration: 0.12, ease: "easeOut" },
					}}
					className={`inline-block h-1 w-3 mb-1 rounded-[1px] ${active ? "bg-cz-led-on" : "bg-cz-led-off"}`}
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
