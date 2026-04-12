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
			className="grid grid-cols-4 gap-1 justify-start items-center"
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
            rounded-xl
            flex flex-col items-center justify-center
            transition-all
            bg-base-200/75
            hover:bg-base-300/90
            ${value === algo.value ? "border-primary bg-base-300 shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_0_24px_rgba(255,113,206,0.2)]" : "border-base-300/70"}
            focus:outline-none
            px-0
            py-0
            shadow-[0_10px_24px_rgba(0,0,0,0.2)]
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
