import { useCallback, useEffect, useRef, useState } from "react";
import type { ModSource } from "@/lib/synth/bindings/synth";
import { noteToFreq, PC_KEY_TO_NOTE } from "@/lib/synth/pdAlgorithms";

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
	sendAftertouch: (value: number) => void;
};

export function useNoteHandling({
	workletNodeRef,
	velocityTarget,
}: UseNoteHandlingParams): NoteHandlingApi {
	const emitModSourceValue = useCallback((source: ModSource, value: number) => {
		window.dispatchEvent(
			new CustomEvent("cz-mod-source", {
				detail: {
					source,
					value: Math.max(0, Math.min(1, value)),
				},
			}),
		);
	}, []);

	void velocityTarget;
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
				// Always forward physical note velocity so ModSource::Velocity works
				// regardless of legacy velocityTarget routing.
				velocity: velocity / 127,
			});
			emitModSourceValue("velocity", velocity / 127);
		},
		[workletNodeRef, emitModSourceValue],
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
			emitModSourceValue("modWheel", value);
		},
		[workletNodeRef, emitModSourceValue],
	);

	const sendAftertouch = useCallback(
		(value: number) => {
			workletNodeRef.current?.port.postMessage({ type: "aftertouch", value });
			emitModSourceValue("aftertouch", value);
		},
		[workletNodeRef, emitModSourceValue],
	);

	// Keyboard input
	useEffect(() => {
		const isTypingTarget = (e: KeyboardEvent) => {
			const target = e.target as HTMLElement | null;
			if (!target) return false;
			if (target.tagName === "TEXTAREA" || target.tagName === "SELECT") {
				return true;
			}
			if (target.tagName !== "INPUT") {
				return false;
			}
			const input = target as HTMLInputElement;
			// Keep note-entry active while focused on sliders and non-text controls.
			return !(
				input.type === "range" ||
				input.type === "checkbox" ||
				input.type === "radio" ||
				input.type === "button"
			);
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

							// Channel pressure / aftertouch (status 0xD0, value in data1)
							if (status === 0xd0) {
								sendAftertouch(data[1] / 127);
								return;
							}

							// Poly pressure (status 0xA0, per-note pressure in data2)
							if (status === 0xa0 && data.length >= 3) {
								sendAftertouch(data[2] / 127);
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
	}, [
		sendModWheel,
		sendPitchBend,
		sendAftertouch,
		sendNoteOn,
		sendNoteOff,
		setSustain,
	]);

	return {
		activeNotes,
		sendNoteOn,
		sendNoteOff,
		setSustain,
		sendPitchBend,
		sendModWheel,
		sendAftertouch,
	};
}
