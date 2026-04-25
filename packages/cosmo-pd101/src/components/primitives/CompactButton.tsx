type CompactButtonProps = {
	active?: boolean;
	onClick?: () => void;
	children: React.ReactNode;
	className?: string;
	disabled?: boolean;
};

/**
 * Compact hardware-style selector button — no LED, no motion.
 * Designed for tight grids where CzButton is too large.
 * Active state inverts colors (light bg / dark text) like a hardware key.
 */
export default function CompactButton({
	active = false,
	onClick,
	children,
	className = "",
	disabled = false,
}: CompactButtonProps) {
	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled}
			className={`inline-flex items-center justify-center h-5 min-w-7 px-1 font-mono text-[0.56rem] font-bold uppercase tracking-wide select-none cursor-pointer transition-colors rounded-xs border disabled:opacity-40 disabled:cursor-not-allowed ${
				active
					? "bg-cz-cream text-cz-body border-cz-cream"
					: "bg-cz-btn text-cz-cream-dim border-cz-btn-border hover:text-cz-cream"
			} ${className}`}
		>
			{children}
		</button>
	);
}
