import type { Adsr } from "./pdAlgorithms";

export function AdsrControls({
	title,
	env,
	onChange,
}: {
	title: string;
	env: Adsr;
	onChange: (next: Adsr) => void;
}) {
	return (
		<div className="p-3 rounded-lg bg-base-200 border border-base-300 space-y-2">
			<div className="text-xs font-semibold text-base-content/70">
				{title} ADSR
			</div>
			<div className="grid grid-cols-2 md:grid-cols-4 gap-2">
				<label className="text-xs flex flex-col gap-1">
					<span>A {env.attack.toFixed(2)}s</span>
					<input
						type="range"
						min={0.01}
						max={2}
						step={0.01}
						value={env.attack}
						onChange={(e) =>
							onChange({ ...env, attack: Number(e.target.value) })
						}
						className="range range-xs range-primary"
					/>
				</label>
				<label className="text-xs flex flex-col gap-1">
					<span>D {env.decay.toFixed(2)}s</span>
					<input
						type="range"
						min={0.01}
						max={2}
						step={0.01}
						value={env.decay}
						onChange={(e) =>
							onChange({ ...env, decay: Number(e.target.value) })
						}
						className="range range-xs range-secondary"
					/>
				</label>
				<label className="text-xs flex flex-col gap-1">
					<span>S {env.sustain.toFixed(2)}</span>
					<input
						type="range"
						min={0}
						max={1}
						step={0.01}
						value={env.sustain}
						onChange={(e) =>
							onChange({ ...env, sustain: Number(e.target.value) })
						}
						className="range range-xs range-accent"
					/>
				</label>
				<label className="text-xs flex flex-col gap-1">
					<span>R {env.release.toFixed(2)}s</span>
					<input
						type="range"
						min={0.01}
						max={3}
						step={0.01}
						value={env.release}
						onChange={(e) =>
							onChange({ ...env, release: Number(e.target.value) })
						}
						className="range range-xs range-warning"
					/>
				</label>
			</div>
		</div>
	);
}
