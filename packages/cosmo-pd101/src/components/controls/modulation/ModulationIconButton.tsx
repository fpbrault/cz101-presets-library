import type React from "react";

interface ModulationIconButtonProps {
	hasActiveRoutes: boolean;
	routeCount: number;
	label: string;
	onClick: () => void;
	forceVisible?: boolean;
	className?: string;
	style?: React.CSSProperties;
	triggerRef?: React.RefCallback<HTMLButtonElement>;
}

export default function ModulationIconButton({
	hasActiveRoutes,
	routeCount,
	label,
	onClick,
	forceVisible = false,
	className = "",
	style,
	triggerRef,
}: ModulationIconButtonProps) {
	const isVisible = hasActiveRoutes || forceVisible;

	return (
		<button
			type="button"
			aria-label={label}
			onClick={onClick}
			ref={triggerRef}
			className={[
				"absolute -bottom-1 -right-1 z-10 flex h-3.5 w-3.5 items-center justify-center rounded-full border text-4xs transition-all focus:outline-none",
				hasActiveRoutes
					? "bg-cz-light-blue border-cz-light-blue text-white"
					: "bg-cz-surface border-cz-border text-cz-cream hover:border-cz-light-blue",
				// Always visible/tappable on touch devices; hover-reveal on pointer devices
				isVisible
					? "opacity-100 pointer-events-auto"
					: [
							"opacity-0 pointer-events-none",
							"group-hover:opacity-100 group-hover:pointer-events-auto",
							// Touch devices: always visible so the badge is tappable
							"[@media(hover:none)]:opacity-100 [@media(hover:none)]:pointer-events-auto",
						].join(" "),
				className,
			].join(" ")}
			style={style}
		>
			{hasActiveRoutes ? routeCount : "+"}
		</button>
	);
}
