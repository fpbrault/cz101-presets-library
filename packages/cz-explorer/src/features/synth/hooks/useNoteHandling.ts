import { useCallback, useEffect, useRef, useState } from "react";
import { noteToFreq, PC_KEY_TO_NOTE } from "@/components/pdAlgorithms";

type UseNoteHandlingParams = {
	workletNodeRef: React.MutableRefObject<AudioWorkletNode | null>;
	velocityTarget: "amp" | "dcw" | "both" | "off";
};

export type NoteHandlingApi = {
	activeNotes: number[];
	sendNoteOn: (note: number, velocity?: number) => void;
	sendNoteOff: (note: number) => void;
	setSustain: (on: boolean) => void;
	sendPitchBend: (value: number) => void;
	sendModWheel: (value: number) => void;
};

export function useNoteHandling({
	workletNodeRef,
	velocityTarget,
}: UseNoteHandlingParams): NoteHandlingApi {
	const activeNotesRef = useRef<Set<number>>(new Set());
	const sustainedButReleasedRef = useRef<Set<number>>(new Set());
	const sustainRef = useRef(false);
	const [activeNotes, setActiveNotes] = useState<number[]>([]);

	const sendNoteOn = useCallback(
		(note: number, velocity = 100) => {
			if (activeNotesRef.current.has(note)) return;
			activeNotesRef.current.add(note);
			setActiveNotes((prev) => (prev.includes(note) ? prev : [...prev, note]));
			workletNodeRef.current?.port.postMessage({
				type: "noteOn",
				note,
				frequency: noteToFreq(note),
				velocity: velocityTarget !== "off" ? velocity / 127 : 0,
			});
		},
		[velocityTarget, workletNodeRef],
	);

	const sendNoteOff = useCallback(
		(note: number) => {
			activeNotesRef.current.delete(note);
			setActiveNotes((prev) => prev.filter((n) => n !== note));
			if (sustainRef.current) {
				sustainedButReleasedRef.current.add(note);
			} else {
				workletNodeRef.current?.port.postMessage({ type: "noteOff", note });
			}
		},
		[workletNodeRef],
	);

	const setSustain = useCallback(
		(on: boolean) => {
			sustainRef.current = on;
			workletNodeRef.current?.port.postMessage({ type: "sustain", on });
			if (!on) {
				for (const note of sustainedButReleasedRef.current) {
					if (!activeNotesRef.current.has(note)) {
						workletNodeRef.current?.port.postMessage({ type: "noteOff", note });
					}
				}
				sustainedButReleasedRef.current.clear();
			}
		},
		[workletNodeRef],
	);

	const sendPitchBend = useCallback(
		(value: number) => {
			workletNodeRef.current?.port.postMessage({ type: "pitchBend", value });
		},
		[workletNodeRef],
	);

	const sendModWheel = useCallback(
		(value: number) => {
			workletNodeRef.current?.port.postMessage({ type: "modWheel", value });
		},
		[workletNodeRef],
	);

	// Keyboard input
	useEffect(() => {
		const isTypingTarget = (e: KeyboardEvent) => {
			const tag = (e.target as HTMLElement | null)?.tagName;
			return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
		};

		const keyDown = (event: KeyboardEvent) => {
			if (isTypingTarget(event)) return;
			if (event.key === " ") {
				event.preventDefault();
				if (!sustainRef.current) setSustain(true);
				return;
			}
			const key = event.key.toLowerCase();
			const note = PC_KEY_TO_NOTE[key];
			if (note == null) return;
			event.preventDefault();
			if (activeNotesRef.current.has(note)) return;
			sendNoteOn(note);
		};

		const keyUp = (event: KeyboardEvent) => {
			if (isTypingTarget(event)) return;
			if (event.key === " ") {
				setSustain(false);
				return;
			}
			const key = event.key.toLowerCase();
			const note = PC_KEY_TO_NOTE[key];
			if (note == null) return;
			sendNoteOff(note);
		};

		window.addEventListener("keydown", keyDown);
		window.addEventListener("keyup", keyUp);
		return () => {
			window.removeEventListener("keydown", keyDown);
			window.removeEventListener("keyup", keyUp);
		};
	}, [sendNoteOn, sendNoteOff, setSustain]);

	// MIDI input
	useEffect(() => {
		if (!("requestMIDIAccess" in navigator) || !navigator.requestMIDIAccess)
			return;

		let disposed = false;
		const cleanupHandlers: Array<() => void> = [];

		navigator
			.requestMIDIAccess()
			.then((access) => {
				if (disposed) return;

				const bindInputs = () => {
					for (const input of access.inputs.values()) {
						const handler = (event: MIDIMessageEvent) => {
							const data = event.data;
							if (data == null || data.length < 2) return;

							const status = data[0] & 0xf0;

							// CC messages
							if (status === 0xb0) {
								if (data[1] === 1) {
									sendModWheel(data[2] / 127);
								} else if (data[1] === 64) {
									setSustain(data[2] >= 64);
								}
								return;
							}

							// Pitch bend
							if (status === 0xe0 && data.length >= 3) {
								const raw = (data[2] << 7) | data[1];
								sendPitchBend((raw - 8192) / 8192);
								return;
							}

							// Note on/off
							if (status === 0x90 && data[2] > 0) {
								sendNoteOn(data[1], data[2]);
							} else if (
								status === 0x80 ||
								(status === 0x90 && data[2] === 0)
							) {
								sendNoteOff(data[1]);
							}
						};

						input.onmidimessage = handler;
						cleanupHandlers.push(() => {
							input.onmidimessage = null;
						});
					}
				};

				bindInputs();

				access.onstatechange = () => {
					if (disposed) return;
					bindInputs();
				};
			})
			.catch((err) => {
				console.warn("[MIDI] Failed to access MIDI inputs:", err);
			});

		return () => {
			disposed = true;
			for (const fn of cleanupHandlers) {
				fn();
			}
		};
	}, [sendModWheel, sendPitchBend, sendNoteOn, sendNoteOff, setSustain]);

	return {
		activeNotes,
		sendNoteOn,
		sendNoteOff,
		setSustain,
		sendPitchBend,
		sendModWheel,
	};
}
