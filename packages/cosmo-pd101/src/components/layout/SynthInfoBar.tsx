import type { ReactNode } from "react";

type SynthInfoBarProps = {
	infoText: string;
	bottomBarExtra?: ReactNode;
	showKeyboardToggle: boolean;
	keyboardVisible: boolean;
	onKeyboardToggle: () => void;
};

export default function SynthInfoBar({
	infoText,
	bottomBarExtra,
	showKeyboardToggle,
	keyboardVisible,
	onKeyboardToggle,
}: SynthInfoBarProps) {
	return (
		<div className="relative z-20 mt-1 flex min-h-8 flex-wrap items-center gap-x-3 gap-y-1 rounded-t-sm border border-cz-border/80 bg-cz-body px-3 py-1 font-mono text-[0.62rem] uppercase tracking-[0.22em] text-cz-cream/80 shadow-inner">
			<span className="text-cz-light-blue/80">Info</span>
			<span className="min-w-0 flex-1 truncate">{infoText}</span>
			{bottomBarExtra ? (
				<div className="flex items-center gap-2 text-[0.54rem] tracking-[0.18em]">
					{bottomBarExtra}
				</div>
			) : null}
			{showKeyboardToggle ? (
				<button
					type="button"
					onClick={onKeyboardToggle}
					className={`rounded-sm border px-2 py-1 text-[0.56rem] uppercase tracking-[0.24em] transition-colors ${
						keyboardVisible
							? "border-cz-gold bg-cz-gold/10 text-cz-gold"
							: "border-cz-border bg-black/10 text-cz-cream/70 hover:text-cz-cream"
					}`}
				>
					{keyboardVisible ? "Hide Keys" : "Show Keys"}
				</button>
			) : null}
		</div>
	);
}
