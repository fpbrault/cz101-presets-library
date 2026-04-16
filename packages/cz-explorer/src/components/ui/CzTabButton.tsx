import type React from "react";
import { joinClasses } from "@/components/ui/Card";

export type CzTabButtonColor = "black" | "blue" | "grey" | "dark" | "red";
export type CzTabButtonStyleVariant = "cz" | "synth";

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
	styleVariant?: CzTabButtonStyleVariant;
};

const czColorStyles: Record<"black" | "blue", { active: string; inactive: string }> = {
	black: {
		active:
			"text-cz-cream border-cz-btn-border bg-[linear-gradient(180deg,#3b3b3e_0%,#2f2f31_100%)] shadow-[0_1px_0_#111,inset_0_1px_0_rgba(255,255,255,0.2),inset_0_-1px_0_rgba(0,0,0,0.28)]",
		inactive:
			"text-cz-cream-dim border-cz-btn-border bg-[linear-gradient(180deg,#363638_0%,#2a2a2c_100%)] hover:bg-[linear-gradient(180deg,#404044_0%,#343437_100%)]",
	},
	blue: {
		active:
			"text-white border-[#4b5f97] bg-[linear-gradient(180deg,#7d99e1_0%,#5f79bf_100%)] shadow-[0_1px_0_#111,inset_0_1px_0_rgba(255,255,255,0.22),inset_0_-1px_0_rgba(0,0,0,0.2)]",
		inactive:
			"text-[#e3ebff] border-[#5369a4] bg-[linear-gradient(180deg,#8dacfa_0%,#6f8fd6_100%)] hover:bg-[linear-gradient(180deg,#94b4ff_0%,#7797df_100%)]",
	},
};

const synthColorStyles: Record<"blue" | "grey" | "dark" | "red", { active: string; inactive: string }> = {
	blue: {
		active: "bg-[#6b8ace] text-gray-100",
		inactive: "bg-[#5c7bbd] hover:bg-[#6b8ace] text-gray-100",
	},
	grey: {
		active: "bg-[#9a9fa8] text-gray-100",
		inactive: "bg-[#8a9199] hover:bg-[#9a9fa8] text-gray-100",
	},
	dark: {
		active: "bg-[#383d42] text-gray-300",
		inactive: "bg-[#2d3136] hover:bg-[#383d42] text-gray-300",
	},
	red: {
		active: "bg-[#d85c5c] text-gray-100",
		inactive: "bg-[#c94b4b] hover:bg-[#d85c5c] text-gray-100",
	},
};

const getPalette = (
	styleVariant: CzTabButtonStyleVariant,
	color: CzTabButtonColor,
): { active: string; inactive: string } => {
	if (styleVariant === "synth") {
		const synthColor = color === "black" ? "dark" : color;
		if (synthColor === "blue" || synthColor === "grey" || synthColor === "dark" || synthColor === "red") {
			return synthColorStyles[synthColor];
		}
		return synthColorStyles.dark;
	}

	const czColor = color === "blue" ? "blue" : "black";
	return czColorStyles[czColor];
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
	styleVariant = "cz",
}: CzTabButtonProps) {
	const palette = getPalette(styleVariant, color);
	const buttonBaseClass =
		styleVariant === "synth"
			? "relative h-12 w-full flex items-center justify-center rounded-[2px] border-t border-b-2 border-l border-r border-zinc-900 font-sans text-[11px] font-bold tracking-wider transition-all duration-75 select-none shadow-[inset_0_2px_1px_rgba(255,255,255,0.25),inset_0_-1px_2px_rgba(0,0,0,0.3),0_4px_0_#121212,0_5px_4px_rgba(0,0,0,0.6)] active:translate-y-[3px] active:shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),inset_0_-1px_1px_rgba(0,0,0,0.2),0_1px_0_#121212,0_1px_1px_rgba(0,0,0,0.4)]"
			: "h-12 w-full shrink-0 flex items-center justify-center rounded-[2px] border uppercase tracking-[0.06em] text-[0.56rem] leading-[1.08] font-bold transition-colors px-1 py-1 shadow-[0_2px_0_#111,inset_0_1px_0_rgba(255,255,255,0.18)]";
	const labelClass =
		styleVariant === "synth"
			? "text-center uppercase leading-tight"
			: "text-center font-['Arial_Narrow','Arial',sans-serif]";

	return (
		<div className={joinClasses("w-full flex flex-col items-center gap-1", className)}>
			{showLed ? (
				<span
					className={`inline-block h-1 w-3 mb-1 rounded-[1px] transition-all duration-75 ${
						active
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
					buttonBaseClass,
					"disabled:opacity-40 disabled:cursor-not-allowed",
					active ? palette.active : palette.inactive,
					buttonClassName,
				)}
				aria-pressed={active}
			>
				<span className={labelClass}>
					<span className="block">{topLabel}</span>
					<span className="block">{bottomLabel}</span>
				</span>
			</button>
		</div>
	);
}
