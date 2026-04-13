import type React from "react";

export type CardVariant = "panel" | "hero" | "subtle" | "inset";
export type CardPadding = "none" | "sm" | "md" | "lg";

type CardProps<T extends React.ElementType = "div"> = {
	as?: T;
	variant?: CardVariant;
	padding?: CardPadding;
	className?: string;
} & Omit<React.ComponentPropsWithoutRef<T>, "as" | "className">;

export const CARD_BASE_CLASSES =
	"card border border-base-300/70 text-base-content outline-none";

export const CARD_VARIANT_CLASSES: Record<CardVariant, string> = {
	panel:
		"rounded-[1.8rem] bg-[linear-gradient(180deg,rgba(27,29,43,0.95),rgba(17,18,28,0.98))]",
	hero:
		"rounded-[1.8rem] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.07),rgba(255,255,255,0)_42%),linear-gradient(180deg,rgba(26,27,40,0.98),rgba(18,19,30,0.98))]",
	subtle: "rounded-2xl bg-base-300/20",
	inset: "rounded-xl bg-base-100/30",
};

export const CARD_PADDING_CLASSES: Record<Exclude<CardPadding, "none">, string> = {
	sm: "p-3",
	md: "p-4",
	lg: "p-6",
};

export function joinClasses(...classes: Array<string | false | null | undefined>) {
	return classes.filter(Boolean).join(" ");
}

export function getCardClassName({
	variant,
	padding,
	className,
	baseClassName = CARD_BASE_CLASSES,
}: {
	variant: CardVariant;
	padding: CardPadding;
	className?: string;
	baseClassName?: string;
}) {
	return joinClasses(
		baseClassName,
		CARD_VARIANT_CLASSES[variant],
		padding !== "none" && CARD_PADDING_CLASSES[padding],
		className,
	);
}

export default function Card<T extends React.ElementType = "div">({
	as,
	variant = "panel",
	padding = "md",
	className = "",
	...props
}: CardProps<T>) {
	const Component = as ?? "div";

	return (
		<Component
			className={getCardClassName({ variant, padding, className })}
			{...props}
		/>
	);
}