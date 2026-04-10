import { PD_ALGOS, type PdAlgo } from "./pdAlgorithms";

export default function AlgoIconGrid({
	value,
	onChange,
	size = 32,
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
			className="grid grid-cols-8 gap-2 justify-start items-center"
			style={{
				userSelect: "none",
				pointerEvents: disabled ? "none" : undefined,
			}}
		>
			{PD_ALGOS.map((algo) => (
				<button
					key={String(algo.value)}
					type="button"
					title={algo.label}
					className={`
            border
            rounded-lg
            flex flex-col items-center justify-center
            transition-colors
            bg-base-200
            hover:bg-base-300
            ${value === algo.value ? "ring-2 ring-primary border-primary" : "border-base-300"}
            focus:outline-none
            px-0
            py-0
            shadow-sm
          `}
					style={{ width: size, height: size }}
					onClick={() => !disabled && onChange(algo.value)}
					disabled={disabled}
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
						role="img"
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
