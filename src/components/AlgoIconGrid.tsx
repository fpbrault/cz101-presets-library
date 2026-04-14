import { PD_ALGOS, type PdAlgo } from "./pdAlgorithms";

export default function AlgoIconGrid({
	value,
	onChange,
	size = 28,
	disabled = false,
}: {
	value: PdAlgo;
	onChange: (v: PdAlgo) => void;
	size?: number;
	disabled?: boolean;
}) {
	const iconSize = Math.max(16, size - 12);
	return (
		<div
			className={[
				"grid grid-cols-5 gap-y-1 w-full h-full justify-center transition-opacity",
				disabled ? "opacity-30" : "",
			].join(" ")}
			style={{ pointerEvents: disabled ? "none" : undefined }}
		>
			{PD_ALGOS.map((algo) => (
				<button
					key={String(algo.value)}
					type="button"
					title={algo.label}
					onClick={() => !disabled && onChange(algo.value)}
					disabled={disabled}
					className={[
						"flex  items-center justify-center transition-colors focus:outline-none border-t-0 border-b border-l border-r text-cz-gold border-cz-light-blue",
						value === algo.value
							? "border-cz-light-blue bg-cz-inset text-white shadow-[0_0_8px_var(--color-cz-gold)/30%]"
							: "border-cz-border bg-cz-surface  hover:border-cz-light-blue hover:text-white",
					].join(" ")}
					style={{ height: size, width: size + 4 }}
				>
					<svg
						viewBox="0 0 24 24"
						width={iconSize}
						height={iconSize}
						stroke="currentColor"
						strokeWidth="1.5"
						fill="none"
						strokeLinecap="round"
						strokeLinejoin="round"
						aria-hidden="true"
					>
						<title>{algo.label}</title>
						<path d={algo.icon} />
					</svg>
				</button>
			))}
		</div>
	);
}
