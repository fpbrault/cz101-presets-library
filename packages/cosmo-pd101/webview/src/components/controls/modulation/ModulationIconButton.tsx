import type React from "react";

interface ModulationIconButtonProps {
	hasActiveRoutes: boolean;
	routeCount: number;
	label: string;
	onClick: () => void;
	forceVisible?: boolean;
	className?: string;
	style?: React.CSSProperties;
}

export default function ModulationIconButton({
	hasActiveRoutes,
	routeCount,
	label,
	onClick,
	forceVisible = false,
	className = "",
	style,
}: ModulationIconButtonProps) {
	const isVisible = hasActiveRoutes || forceVisible;

	return (
		<button
			type="button"
			aria-label={label}
			onClick={onClick}
			className={[
				"absolute -bottom-1 -right-1 z-10 flex h-3.5 w-3.5 items-center justify-center rounded-full border text-4xs transition-all focus:outline-none",
				hasActiveRoutes
					? "bg-cz-light-blue border-cz-light-blue text-white"
					: "bg-cz-surface border-cz-border text-cz-cream hover:border-cz-light-blue",
				isVisible
					? "opacity-100"
					: "pointer-events-none opacity-0 group-hover:opacity-100 group-hover:pointer-events-auto",
				className,
			].join(" ")}
			style={style}
		>
			{hasActiveRoutes ? routeCount : "+"}
		</button>
	);
}
