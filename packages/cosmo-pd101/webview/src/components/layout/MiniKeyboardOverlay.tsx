import { AnimatePresence, motion } from "motion/react";

type MiniKeyboardOverlayProps = {
	activeNotes: number[];
	visible: boolean;
	onNoteOn: (note: number, velocity?: number) => void;
	onNoteOff: (note: number) => void;
};

type KeyConfig = {
	note: number;
	label: string;
	black: boolean;
	left?: number;
};

const WHITE_KEYS = [
	{ note: 48, label: "C" },
	{ note: 50, label: "D" },
	{ note: 52, label: "E" },
	{ note: 53, label: "F" },
	{ note: 55, label: "G" },
	{ note: 57, label: "A" },
	{ note: 59, label: "B" },
	{ note: 60, label: "C" },
	{ note: 62, label: "D" },
	{ note: 64, label: "E" },
	{ note: 65, label: "F" },
	{ note: 67, label: "G" },
	{ note: 69, label: "A" },
	{ note: 71, label: "B" },
] as const satisfies ReadonlyArray<KeyConfig>;

const BLACK_KEYS = [
	{ note: 49, label: "C#", black: true, left: 9.2 },
	{ note: 51, label: "D#", black: true, left: 16.4 },
	{ note: 54, label: "F#", black: true, left: 31.0 },
	{ note: 56, label: "G#", black: true, left: 38.2 },
	{ note: 58, label: "A#", black: true, left: 45.4 },
	{ note: 61, label: "C#", black: true, left: 59.8 },
	{ note: 63, label: "D#", black: true, left: 67.0 },
	{ note: 66, label: "F#", black: true, left: 81.6 },
	{ note: 68, label: "G#", black: true, left: 88.8 },
	{ note: 70, label: "A#", black: true, left: 96.0 },
] as const satisfies ReadonlyArray<KeyConfig>;

function PianoKey({
	note,
	label,
	active,
	black,
	left,
	onNoteOn,
	onNoteOff,
}: {
	note: number;
	label: string;
	active: boolean;
	black?: boolean;
	left?: number;
	onNoteOn: (note: number, velocity?: number) => void;
	onNoteOff: (note: number) => void;
}) {
	const keyClassName = black
		? `absolute top-0 z-10 h-[58%] w-[6.2%] -translate-x-1/2 rounded-b-md border border-cz-border/80 bg-[linear-gradient(180deg,#0e0f12,#1d2230_55%,#13161d)] px-0 pb-2 pt-1 text-[0.46rem] font-mono uppercase tracking-[0.18em] text-cz-light-blue/80 shadow-[0_10px_18px_rgba(0,0,0,0.35)] transition-all ${
				active ? "border-cz-light-blue bg-[linear-gradient(180deg,#1f2740,#324066_60%,#1a2238)] text-cz-cream" : ""
			}`
		: `relative flex h-full flex-1 flex-col justify-end rounded-b-lg border border-cz-border/80 bg-[linear-gradient(180deg,#f2f0e6,#dad5c6_55%,#b7b09d)] px-1 pb-2 pt-2 text-[0.5rem] font-mono uppercase tracking-[0.18em] text-[#302d26] shadow-[0_10px_18px_rgba(0,0,0,0.12)] transition-all ${
				active ? "translate-y-[1px] border-cz-gold bg-[linear-gradient(180deg,#fff8d6,#e9df9f_58%,#c8b75d)] text-[#232018]" : ""
			}`;

	return (
		<button
			type="button"
			aria-label={`Play ${label}`}
			className={keyClassName}
			style={black && left !== undefined ? { left: `${left}%` } : undefined}
			onPointerDown={(event) => {
				event.preventDefault();
				onNoteOn(note, 112);
			}}
			onPointerUp={() => onNoteOff(note)}
			onPointerLeave={() => onNoteOff(note)}
			onPointerCancel={() => onNoteOff(note)}
		>
			<span className={black ? "mt-auto" : "mt-auto opacity-70"}>{label}</span>
		</button>
	);
}

export default function MiniKeyboardOverlay({
	activeNotes,
	visible,
	onNoteOn,
	onNoteOff,
}: MiniKeyboardOverlayProps) {
	const activeSet = new Set(activeNotes);

	return (
		<AnimatePresence initial={false}>
			{visible ? (
				<motion.div
					key="mini-keyboard"
					initial={{ opacity: 0, y: 28 }}
					animate={{ opacity: 1, y: 0 }}
					exit={{ opacity: 0, y: 22 }}
					transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
					className="pointer-events-none absolute inset-x-4 bottom-9 z-20 flex justify-center"
				>
					<div className="pointer-events-auto w-full max-w-5xl overflow-hidden rounded-[1.35rem] border border-cz-border bg-[linear-gradient(180deg,rgba(45,46,44,0.96),rgba(27,28,27,0.99))] p-3 shadow-[0_26px_56px_rgba(0,0,0,0.4)] backdrop-blur-sm">
						<div className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-[repeating-linear-gradient(90deg,rgba(123,150,226,0.08)_0px,rgba(123,150,226,0.08)_1px,transparent_1px,transparent_22px)] opacity-70" />
						<div className="relative mb-2 flex items-center justify-between px-1 font-mono text-[0.56rem] uppercase tracking-[0.24em] text-cz-cream/70">
							<span>Performance Keys</span>
							<span>{activeNotes.length > 0 ? `Held ${activeNotes.length}` : "Ready"}</span>
						</div>
						<div className="relative flex h-28 gap-1 overflow-hidden rounded-xl border border-cz-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(0,0,0,0.12))] p-2">
							{WHITE_KEYS.map((key) => (
								<PianoKey
									key={key.note}
									note={key.note}
									label={key.label}
									active={activeSet.has(key.note)}
									onNoteOn={onNoteOn}
									onNoteOff={onNoteOff}
								/>
							))}
							{BLACK_KEYS.map((key) => (
								<PianoKey
									key={key.note}
									note={key.note}
									label={key.label}
									black
									left={key.left}
									active={activeSet.has(key.note)}
									onNoteOn={onNoteOn}
									onNoteOff={onNoteOff}
								/>
							))}
						</div>
					</div>
				</motion.div>
			) : null}
		</AnimatePresence>
	);
}