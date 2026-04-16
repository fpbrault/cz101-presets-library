import type React from "react";

export type CardVariant =
	| "panel"
	| "panel-slanted"
	| "panel-gold"
	| "hero"
	| "subtle"
	| "inset";
export type CardPadding = "none" | "sm" | "md" | "lg";

type CardProps<T extends React.ElementType = "div"> = {
	as?: T;
	variant?: CardVariant;
	padding?: CardPadding;
	className?: string;
} & Omit<React.ComponentPropsWithoutRef<T>, "as" | "className">;

export const CARD_BASE_CLASSES =
	"card border border-cz-border text-cz-cream outline-none";

export const CARD_VARIANT_CLASSES: Record<CardVariant, string> = {
	panel: "rounded-2xl  ",
	"panel-slanted": "rounded-none cz-section-slanted",
	"panel-gold": "rounded-none cz-section-gold",
	hero: "rounded-2xl bg-cz-surface ",
	subtle: "rounded-xl bg-cz-surface/20",
	inset: "rounded-lg bg-cz-inset",
};

export const CARD_PADDING_CLASSES: Record<
	Exclude<CardPadding, "none">,
	string
> = {
	sm: "p-3",
	md: "p-4",
	lg: "p-6",
};

export function joinClasses(
	...classes: Array<string | false | null | undefined>
) {
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
