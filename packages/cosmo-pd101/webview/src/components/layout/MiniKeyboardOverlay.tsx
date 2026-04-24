import { AnimatePresence, motion } from "motion/react";
import {
	type PointerEvent as ReactPointerEvent,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";

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

const WHITE_OFFSETS = [0, 2, 4, 5, 7, 9, 11] as const;
const WHITE_LABELS = ["C", "D", "E", "F", "G", "A", "B"] as const;
const BLACK_CONFIG = [
	{ offset: 1, label: "C#", boundary: 1 },
	{ offset: 3, label: "D#", boundary: 2 },
	{ offset: 6, label: "F#", boundary: 4 },
	{ offset: 8, label: "G#", boundary: 5 },
	{ offset: 10, label: "A#", boundary: 6 },
] as const;

const START_NOTE = 36;
const KEYBOARD_OCTAVES = 4;

const WHITE_KEY_CLASS_NAME =
	"relative flex h-full flex-1 flex-col justify-end rounded-b-xs border border-cz-border/75 bg-white shadow-sm transition-all";
const BLACK_KEY_CLASS_NAME =
	"absolute top-0 z-10 h-3/5 w-[2.45%] -translate-x-1/2 rounded-b-xs border border-cz-border/80 bg-cz-inset shadow-md transition-all";

function buildKeyboardLayout(startNote: number, octaves: number) {
	const whiteKeys: KeyConfig[] = [];
	const blackKeys: KeyConfig[] = [];
	const totalWhiteKeys = octaves * WHITE_OFFSETS.length;

	for (let octave = 0; octave < octaves; octave += 1) {
		const octaveBaseNote = startNote + octave * 12;
		const whiteBaseIndex = octave * WHITE_OFFSETS.length;

		for (let i = 0; i < WHITE_OFFSETS.length; i += 1) {
			whiteKeys.push({
				note: octaveBaseNote + WHITE_OFFSETS[i],
				label: WHITE_LABELS[i],
				black: false,
			});
		}

		for (const blackKey of BLACK_CONFIG) {
			const boundary = whiteBaseIndex + blackKey.boundary;
			blackKeys.push({
				note: octaveBaseNote + blackKey.offset,
				label: blackKey.label,
				black: true,
				left: (boundary / totalWhiteKeys) * 100,
			});
		}
	}

	return { whiteKeys, blackKeys };
}

function PianoKey({
	note,
	label,
	active,
	black,
	left,
	onPointerDown,
}: {
	note: number;
	label: string;
	active: boolean;
	black?: boolean;
	left?: number;
	onPointerDown: (
		event: ReactPointerEvent<HTMLButtonElement>,
		note: number,
	) => void;
}) {
	const keyClassName = black ? BLACK_KEY_CLASS_NAME : WHITE_KEY_CLASS_NAME;
	const activeClassName = black
		? "border-cz-light-blue bg-cz-surface"
		: "translate-y-px border-cz-gold bg-cz-gold/70";

	return (
		<button
			type="button"
			aria-label={`Play ${label}`}
			className={`${keyClassName} ${active ? activeClassName : ""} touch-none`}
			data-mini-note={note}
			style={black && left !== undefined ? { left: `${left}%` } : undefined}
			onPointerDown={(event) => onPointerDown(event, note)}
		></button>
	);
}

export default function MiniKeyboardOverlay({
	activeNotes,
	visible,
	onNoteOn,
	onNoteOff,
}: MiniKeyboardOverlayProps) {
	const [pitchWheel, setPitchWheel] = useState(0);
	const [modWheel, setModWheel] = useState(0);
	const draggingPointerIdRef = useRef<number | null>(null);
	const draggingNoteRef = useRef<number | null>(null);
	const activeSet = new Set(activeNotes);
	const { whiteKeys, blackKeys } = useMemo(
		() => buildKeyboardLayout(START_NOTE, KEYBOARD_OCTAVES),
		[],
	);

	const playDraggedNote = useCallback(
		(note: number) => {
			const previousNote = draggingNoteRef.current;
			if (previousNote === note) {
				return;
			}

			if (previousNote !== null) {
				onNoteOff(previousNote);
			}

			draggingNoteRef.current = note;
			onNoteOn(note, 112);
		},
		[onNoteOn, onNoteOff],
	);

	const stopDragging = useCallback(() => {
		const previousNote = draggingNoteRef.current;
		if (previousNote !== null) {
			onNoteOff(previousNote);
		}

		draggingPointerIdRef.current = null;
		draggingNoteRef.current = null;
	}, [onNoteOff]);

	useEffect(() => {
		const onWindowPointerMove = (event: PointerEvent) => {
			if (draggingPointerIdRef.current !== event.pointerId) {
				return;
			}

			if (event.pointerType === "mouse" && event.buttons === 0) {
				stopDragging();
				return;
			}

			const elementUnderPointer = document.elementFromPoint(
				event.clientX,
				event.clientY,
			) as HTMLElement | null;
			const keyElement =
				elementUnderPointer?.closest<HTMLElement>("[data-mini-note]");
			if (!keyElement) {
				return;
			}

			const noteAttribute = keyElement.dataset.miniNote;
			if (!noteAttribute) {
				return;
			}

			const parsedNote = Number(noteAttribute);
			if (!Number.isNaN(parsedNote)) {
				playDraggedNote(parsedNote);
			}
		};

		const onWindowPointerUp = (event: PointerEvent) => {
			if (draggingPointerIdRef.current === event.pointerId) {
				stopDragging();
			}
		};

		const onWindowPointerCancel = (event: PointerEvent) => {
			if (draggingPointerIdRef.current === event.pointerId) {
				stopDragging();
			}
		};

		window.addEventListener("pointermove", onWindowPointerMove);
		window.addEventListener("pointerup", onWindowPointerUp);
		window.addEventListener("pointercancel", onWindowPointerCancel);

		return () => {
			window.removeEventListener("pointermove", onWindowPointerMove);
			window.removeEventListener("pointerup", onWindowPointerUp);
			window.removeEventListener("pointercancel", onWindowPointerCancel);
		};
	}, [playDraggedNote, stopDragging]);

	useEffect(() => {
		if (!visible) {
			stopDragging();
		}
	}, [stopDragging, visible]);

	useEffect(() => () => stopDragging(), [stopDragging]);

	const handleKeyPointerDown = useCallback(
		(event: ReactPointerEvent<HTMLButtonElement>, note: number) => {
			event.preventDefault();
			draggingPointerIdRef.current = event.pointerId;
			playDraggedNote(note);
		},
		[playDraggedNote],
	);

	return (
		<AnimatePresence initial={false}>
			{visible ? (
				<motion.div
					key="mini-keyboard"
					initial={{ opacity: 0, y: 28 }}
					animate={{ opacity: 1, y: 0 }}
					exit={{ opacity: 0, y: 22 }}
					transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
					className="pointer-events-none absolute inset-x-0 bottom-8 z-20"
				>
					<div
						data-testid="mini-keyboard-overlay"
						className="pointer-events-auto w-full overflow-hidden rounded-t-2xl rounded-b-none border border-cz-border border-b-0 bg-cz-body px-0 py-1 shadow-xl backdrop-blur-sm"
					>
						<div className="pointer-events-none absolute inset-x-0 top-0 h-6 bg-cz-light-blue/10 opacity-50" />
						<div className="relative flex h-32 gap-2 overflow-hidden rounded-none border border-x-0 border-b-0 border-cz-border/70 bg-cz-inset px-2">
							<div className="flex w-14 shrink-0 items-end gap-1 rounded-md border border-cz-border/60 bg-black/20 px-1.5 pb-1.5 pt-1">
								<div className="flex flex-1 flex-col items-center gap-1">
									<input
										aria-label="Pitch wheel"
										type="range"
										min={-1}
										max={1}
										step={0.01}
										value={pitchWheel}
										onChange={(event) =>
											setPitchWheel(Number(event.target.value))
										}
										className="h-24 w-3 cursor-pointer appearance-none bg-transparent [writing-mode:bt-lr] [-webkit-appearance:slider-vertical]"
									/>
									<span className="text-5xs font-mono uppercase tracking-wider text-cz-cream/70">
										P
									</span>
								</div>
								<div className="flex flex-1 flex-col items-center gap-1">
									<input
										aria-label="Mod wheel"
										type="range"
										min={0}
										max={1}
										step={0.01}
										value={modWheel}
										onChange={(event) =>
											setModWheel(Number(event.target.value))
										}
										className="h-24 w-3 cursor-pointer appearance-none bg-transparent [writing-mode:bt-lr] [-webkit-appearance:slider-vertical]"
									/>
									<span className="text-5xs font-mono uppercase tracking-wider text-cz-cream/70">
										M
									</span>
								</div>
							</div>

							<div className="relative flex min-w-0 flex-1 gap-0.5 overflow-hidden rounded-md border border-cz-border/65 bg-cz-surface p-1">
								{whiteKeys.map((key) => (
									<PianoKey
										key={key.note}
										note={key.note}
										label={key.label}
										active={activeSet.has(key.note)}
										onPointerDown={handleKeyPointerDown}
									/>
								))}
								{blackKeys.map((key) => (
									<PianoKey
										key={key.note}
										note={key.note}
										label={key.label}
										black
										left={key.left}
										active={activeSet.has(key.note)}
										onPointerDown={handleKeyPointerDown}
									/>
								))}
							</div>
						</div>
					</div>
				</motion.div>
			) : null}
		</AnimatePresence>
	);
}
