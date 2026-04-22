import type React from "react";
import { joinClasses } from "@/components/ui/Card";

export type CzTabButtonColor = "black" | "blue" | "cyan" | "grey" | "red";
export type CzTabButtonLedColor = "off" | "red" | "green" | "blue";

type CzTabButtonProps = {
	active?: boolean;
	onClick?: () => void;
	topLabel: React.ReactNode;
	bottomLabel: React.ReactNode;
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
			"text-white border-cz-btn-border bg-[linear-gradient(180deg,#3b3b3e_0%,#2f2f31_100%)] shadow-[0_1px_0_#111,inset_0_1px_0_rgba(255,255,255,0.2),inset_0_-1px_0_rgba(0,0,0,0.28)]",
		inactive:
			"text-white border-cz-btn-border bg-[linear-gradient(180deg,#363638_0%,#2a2a2c_100%)] hover:bg-[linear-gradient(180deg,#404044_0%,#343437_100%)]",
	},
	blue: {
		active:
			"text-white border-[#4b5f97] bg-[linear-gradient(180deg,#7d99e1_0%,#5f79bf_100%)] shadow-[0_1px_0_#111,inset_0_1px_0_rgba(255,255,255,0.22),inset_0_-1px_0_rgba(0,0,0,0.2)]",
		inactive:
			"text-white border-[#5369a4] bg-[linear-gradient(180deg,#8dacfa_0%,#6f8fd6_100%)] hover:bg-[linear-gradient(180deg,#94b4ff_0%,#7797df_100%)]",
	},
	cyan: {
		active:
			"text-white border-[#3f8f98] bg-[linear-gradient(180deg,#69d5de_0%,#3fb4bf_100%)] shadow-[0_1px_0_#111,inset_0_1px_0_rgba(255,255,255,0.24),inset_0_-1px_0_rgba(0,0,0,0.2)]",
		inactive:
			"text-white border-[#3a838c] bg-[linear-gradient(180deg,#61c9d1_0%,#389fa9_100%)] hover:bg-[linear-gradient(180deg,#6ed6de_0%,#43adb8_100%)]",
	},
	grey: {
		active:
			"text-white border-[#7b7b76] bg-[linear-gradient(180deg,#9f9e98_0%,#7f7e79_100%)] shadow-[0_1px_0_#111,inset_0_1px_0_rgba(255,255,255,0.22),inset_0_-1px_0_rgba(0,0,0,0.22)]",
		inactive:
			"text-white border-[#74736f] bg-[linear-gradient(180deg,#8c8b86_0%,#6e6d69_100%)] hover:bg-[linear-gradient(180deg,#979691_0%,#787773_100%)]",
	},
	red: {
		active:
			"text-white border-[#9a4d4d] bg-[linear-gradient(180deg,#c86969_0%,#a94747_100%)] shadow-[0_1px_0_#111,inset_0_1px_0_rgba(255,255,255,0.18),inset_0_-1px_0_rgba(0,0,0,0.22)]",
		inactive:
			"text-white border-[#8f4a4a] bg-[linear-gradient(180deg,#b95b5b_0%,#984141_100%)] hover:bg-[linear-gradient(180deg,#c66565_0%,#a34747_100%)]",
	},
};

/**
 * CZ-style small tab button with optional LED above and a two-line label.
 */
export default function CzTabButton({
	active = false,
	onClick,
	topLabel,
	bottomLabel,
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

	return (
		<div
			className={joinClasses(
				"w-full flex flex-col items-center gap-1",
				className,
			)}
		>
			{showLed ? (
				<span
					className={`inline-block h-1 w-3 mb-1 rounded-[1px] transition-all duration-75 ${
						resolvedLedColor === "blue"
							? "bg-[#7aa8ff] shadow-[0_0_4px_1px_rgba(122,168,255,0.55),inset_0_1px_0_rgba(190,215,255,0.35)]"
							: resolvedLedColor === "green"
								? "bg-[#5dff63] shadow-[0_0_4px_1px_rgba(93,255,99,0.55),inset_0_1px_0_rgba(180,255,185,0.35)]"
								: resolvedLedColor === "red"
									? "bg-cz-led-on shadow-[0_0_4px_1px_rgba(255,30,30,0.55),inset_0_1px_0_rgba(255,180,180,0.3)]"
									: "bg-cz-led-off shadow-[inset_0_1px_1px_rgba(0,0,0,0.6)]"
					}`}
					aria-hidden="true"
				/>
			) : null}
			<button
				type={type}
				disabled={disabled}
				onClick={onClick}
				className={joinClasses(
					"h-12 w-full shrink-0 flex items-center justify-center rounded-xs border uppercase tracking-[0.06em] text-3xs leading-[1.08] font-bold transition-colors px-1 py-1 shadow-[0_2px_0_#111,inset_0_1px_0_rgba(255,255,255,0.18)]",
					"disabled:opacity-40 disabled:cursor-not-allowed",
					active ? palette.active : palette.inactive,
					buttonClassName,
				)}
				aria-pressed={active}
			>
				<span className="text-center font-['Arial_Narrow','Arial',sans-serif]">
					<span className="block">{topLabel}</span>
					<span className="block">{bottomLabel}</span>
				</span>
			</button>
		</div>
	);
}
