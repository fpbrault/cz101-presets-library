import { motion } from "motion/react";
import type React from "react";
import { joinClasses } from "@/components/primitives/Card";

export type CzTabButtonColor = "black" | "blue" | "cyan" | "grey" | "red";
export type CzTabButtonLedColor = "off" | "red" | "green" | "blue";

type CzTabButtonProps = {
	active?: boolean;
	onClick?: () => void;
	topLabel: React.ReactNode;
	bottomLabel: React.ReactNode;
	width?: number;
	height?: number;
	className?: string;
	buttonClassName?: string;
	disabled?: boolean;
	type?: "button" | "submit" | "reset";
	showLed?: boolean;
	color?: CzTabButtonColor;
	ledColor?: CzTabButtonLedColor;
};

const colorStyles: Record<
	CzTabButtonColor,
	{ active: string; inactive: string }
> = {
	black: {
		active:
			"text-white border-cz-btn-border bg-[linear-gradient(180deg,#383839_0%,#2c2c2e_100%)]",
		inactive:
			"text-white border-cz-btn-border bg-[linear-gradient(180deg,#505053_0%,#3a3a3d_40%,#2a2a2c_100%)] hover:bg-[linear-gradient(180deg,#585859_0%,#404044_40%,#343437_100%)]",
	},
	blue: {
		active:
			"text-white border-[#4b5f97] bg-[linear-gradient(180deg,#7085cc_0%,#5566a8_100%)]",
		inactive:
			"text-white border-[#5369a4] bg-[linear-gradient(180deg,#a8c0ff_0%,#8dacfa_30%,#6f8fd6_100%)] hover:bg-[linear-gradient(180deg,#b2caff_0%,#94b4ff_30%,#7797df_100%)]",
	},
	cyan: {
		active:
			"text-white border-[#3f8f98] bg-[linear-gradient(180deg,#56bdc7_0%,#3aa8b2_100%)]",
		inactive:
			"text-white border-[#3a838c] bg-[linear-gradient(180deg,#85dde5_0%,#61c9d1_30%,#389fa9_100%)] hover:bg-[linear-gradient(180deg,#8ee6ee_0%,#6ed6de_30%,#43adb8_100%)]",
	},
	grey: {
		active:
			"text-white border-[#7b7b76] bg-[linear-gradient(180deg,#8e8d88_0%,#747470_100%)]",
		inactive:
			"text-white border-[#74736f] bg-[linear-gradient(180deg,#aeada8_0%,#8c8b86_30%,#6e6d69_100%)] hover:bg-[linear-gradient(180deg,#b6b5b0_0%,#979691_30%,#787773_100%)]",
	},
	red: {
		active:
			"text-white border-[#9a4d4d] bg-[linear-gradient(180deg,#b85c5c_0%,#9f4242_100%)]",
		inactive:
			"text-white border-[#8f4a4a] bg-[linear-gradient(180deg,#d97575_0%,#b95b5b_30%,#984141_100%)] hover:bg-[linear-gradient(180deg,#de8080_0%,#c66565_30%,#a34747_100%)]",
	},
};

/**
 * CZ-style small tab button with optional LED above and a two-line label.
 */

type LedGlowConfig = {
	color: string;
	glow: string;
};

const LED_GLOW: Record<Exclude<CzTabButtonLedColor, "off">, LedGlowConfig> = {
	red: {
		color: "var(--color-cz-led-on, #ff3b3b)",
		glow: "0 0 5px 2px rgba(255,50,50,0.7), inset 0 1px 0 rgba(255,160,160,0.25)",
	},
	green: {
		color: "#5dff63",
		glow: "0 0 5px 2px rgba(93,255,99,0.7), inset 0 1px 0 rgba(180,255,180,0.25)",
	},
	blue: {
		color: "#7aa8ff",
		glow: "0 0 5px 2px rgba(122,168,255,0.7), inset 0 1px 0 rgba(180,210,255,0.25)",
	},
};
export default function CzTabButton({
	active = false,
	onClick,
	topLabel,
	bottomLabel,
	width,
	height,
	className,
	buttonClassName,
	disabled = false,
	type = "button",
	showLed = true,
	color = "black",
	ledColor,
}: CzTabButtonProps) {
	const palette = colorStyles[color];
	const resolvedLedColor = ledColor ?? (active ? "red" : "off");
	const resolvedWidth = width ?? height ?? 48;
	const resolvedHeight = height ?? width ?? 48;

	return (
		<div className={joinClasses("flex flex-col items-center gap-1", className)}>
			{showLed ? (
				<motion.span
					animate={
						resolvedLedColor === "off"
							? {
									backgroundColor: "var(--color-cz-led-off, #3a1a1a)",
									boxShadow: "inset 0 1px 3px rgba(0,0,0,0.7)",
									scaleX: 1,
								}
							: {
									backgroundColor: LED_GLOW[resolvedLedColor].color,
									boxShadow: LED_GLOW[resolvedLedColor].glow,
									scaleX: 1.18,
								}
					}
					transition={{
						backgroundColor: { duration: 0.05 },
						scaleX: { type: "spring", stiffness: 900, damping: 16 },
						boxShadow: { duration: 0.12, ease: "easeOut" },
					}}
					className={`inline-block h-1 w-3 mb-1 rounded-[1px] ${resolvedLedColor !== "off" ? "bg-cz-led-on" : "bg-cz-led-off"}`}
					aria-hidden="true"
				/>
			) : null}
			<motion.button
				type={type}
				disabled={disabled}
				onClick={onClick}
				animate={
					active
						? {
								// pressed: wall collapses
								boxShadow:
									"0 1px 0 rgba(0,0,0,0.6), 0 1px 4px rgba(0,0,0,0.3), inset 0 0px 0px rgba(0,0,0,0)",
								y: 3,
							}
						: {
								// raised: tall bottom wall + diffuse shadow + top edge highlight
								boxShadow:
									"0 4px 0 rgba(0,0,0,0.6), 0 6px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.12)",
								y: 0,
							}
				}
				transition={{ duration: 0.08, ease: "easeOut" }}
				className={joinClasses(
					"shrink-0 flex items-center justify-center rounded-xs border uppercase tracking-[0.06em] text-3xs leading-[1.08] font-bold px-1 py-1",
					"disabled:opacity-40 disabled:cursor-not-allowed",
					active ? palette.active : palette.inactive,
					buttonClassName,
				)}
				style={{ width: `${resolvedWidth}px`, height: `${resolvedHeight}px` }}
				aria-pressed={active}
			>
				<span className="text-center font-['Arial_Narrow','Arial',sans-serif]">
					<span className="block">{topLabel}</span>
					<span className="block">{bottomLabel}</span>
				</span>
			</motion.button>
		</div>
	);
}
