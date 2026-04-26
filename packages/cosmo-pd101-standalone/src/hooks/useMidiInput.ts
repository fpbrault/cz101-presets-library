import { useEffect } from "react";

interface UseMidiInputProps {
	sendNoteOn: (note: number, velocity: number) => void;
	sendNoteOff: (note: number) => void;
}

/**
 * Listens on all available MIDI input ports and routes note-on/note-off
 * messages into the synth engine.
 *
 * Web MIDI API is polyfilled by tauri-plugin-midi on macOS (WKWebView does
 * not expose navigator.requestMIDIAccess natively).
 */
export function useMidiInput({ sendNoteOn, sendNoteOff }: UseMidiInputProps) {
	useEffect(() => {
		let midiAccess: MIDIAccess | null = null;
		let isMounted = true;

		function handleMessage(event: MIDIMessageEvent) {
			const data = event.data;
			if (!data || data.length < 3) return;
			const status = data[0] & 0xf0;
			const note = data[1];
			const velocity = data[2];
			if (status === 0x90 && velocity > 0) {
				// Note-on: map MIDI velocity 0-127 → 0-1 float
				sendNoteOn(note, velocity / 127);
			} else if (status === 0x80 || (status === 0x90 && velocity === 0)) {
				sendNoteOff(note);
			}
		}

		function attachListeners(access: MIDIAccess) {
			for (const input of access.inputs.values()) {
				input.onmidimessage = handleMessage;
			}
		}

		async function init() {
			try {
				midiAccess = await navigator.requestMIDIAccess({ sysex: false });
				if (!isMounted) return;
				attachListeners(midiAccess);
				midiAccess.onstatechange = () => {
					if (midiAccess) attachListeners(midiAccess);
				};
			} catch (err) {
				console.warn("[useMidiInput] MIDI access unavailable:", err);
			}
		}

		void init();

		return () => {
			isMounted = false;
			if (midiAccess) {
				for (const input of midiAccess.inputs.values()) {
					input.onmidimessage = null;
				}
			}
		};
	}, [sendNoteOn, sendNoteOff]);
}
