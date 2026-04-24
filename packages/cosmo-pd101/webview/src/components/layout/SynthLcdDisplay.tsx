import { memo } from "react";

type SynthLcdDisplayProps = {
	primaryText: string;
	secondaryText: string;
	transientReadout?: {
		label: string;
		value: string;
	} | null;
};

function SynthLcdDisplay({
	primaryText,
	secondaryText,
	transientReadout = null,
}: SynthLcdDisplayProps) {
	return (
		<div className="relative w-full rounded-xl border border-cz-btn-border bg-linear-to-b from-[#3f3e3c] to-[#252422] py-2 mb-4 shadow-md">
			<div className="rounded-lg border border-black/80 bg-[#1a1a18] px-3 pb-3 shadow-inner">
				<div className="mb-2 flex items-center justify-between text-4xs font-mono uppercase tracking-[0.22em] text-cz-cream-dim">
					<span>COSMO</span>
					<span>Digital Synthesizer</span>
				</div>

				<div className="relative overflow-hidden rounded-md border border-[#6e8464] bg-[#b7caa5] px-3 py-2 font-mono shadow-inner">
					<div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(to_bottom,rgba(49,67,42,0.08)_0px,rgba(49,67,42,0.08)_1px,transparent_2px,transparent_4px)]" />
					<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(34,40,32,0.16)_85%)]" />

					<div className="relative z-10 grid h-[3.6rem] grid-rows-2 text-[#24331e]">
						<div className="truncate self-center whitespace-nowrap text-sm font-bold uppercase leading-none tracking-widest">
							{transientReadout
								? `${transientReadout.label}: ${transientReadout.value}`
								: primaryText}
						</div>
						<div className="truncate self-center whitespace-nowrap text-2xs uppercase leading-none tracking-[0.08em] text-[#2f4327]/95">
							{transientReadout ? "Control Adjust" : secondaryText}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

export default memo(SynthLcdDisplay);
