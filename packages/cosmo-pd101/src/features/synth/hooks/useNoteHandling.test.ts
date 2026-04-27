import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useNoteHandling } from "./useNoteHandling";

describe("useNoteHandling", () => {
	let events: Array<{ type: string; payload: Record<string, unknown> }>;
	let eventSink: (type: string, payload: Record<string, unknown>) => void;

	beforeEach(() => {
		events = [];
		eventSink = (type, payload) => events.push({ type, payload });
	});

	const renderNoteHandling = () =>
		renderHook(() => useNoteHandling({ eventSink }));

	// ---------------------------------------------------------------------------
	// Basic note on/off
	// ---------------------------------------------------------------------------

	it("sends noteOn event when a note is pressed", () => {
		const { result } = renderNoteHandling();

		act(() => result.current.sendNoteOn(60, 100));

		expect(events).toContainEqual(
			expect.objectContaining({
				type: "noteOn",
				payload: expect.objectContaining({ note: 60 }),
			}),
		);
		expect(result.current.activeNotes).toContain(60);
	});

	it("sends noteOff event when a note is released (no sustain)", () => {
		const { result } = renderNoteHandling();

		act(() => {
			result.current.sendNoteOn(60);
			result.current.sendNoteOff(60);
		});

		expect(events).toContainEqual(
			expect.objectContaining({
				type: "noteOff",
				payload: expect.objectContaining({ note: 60 }),
			}),
		);
		expect(result.current.activeNotes).not.toContain(60);
	});

	it("does not retrigger an already-active note", () => {
		const { result } = renderNoteHandling();

		act(() => {
			result.current.sendNoteOn(60);
			result.current.sendNoteOn(60); // duplicate
		});

		const noteOnCount = events.filter((e) => e.type === "noteOn").length;
		expect(noteOnCount).toBe(1);
	});

	// ---------------------------------------------------------------------------
	// Sustain pedal — basic behaviour
	// ---------------------------------------------------------------------------

	it("does not send noteOff while sustain is on", () => {
		const { result } = renderNoteHandling();

		act(() => {
			result.current.sendNoteOn(60);
			result.current.setSustain(true);
			result.current.sendNoteOff(60);
		});

		const noteOffEvents = events.filter((e) => e.type === "noteOff");
		expect(noteOffEvents).toHaveLength(0);
	});

	it("sends noteOff for sustained-but-released notes when sustain is lifted", () => {
		const { result } = renderNoteHandling();

		act(() => {
			result.current.sendNoteOn(60);
			result.current.setSustain(true);
			result.current.sendNoteOff(60);
			result.current.setSustain(false);
		});

		const noteOffEvents = events.filter((e) => e.type === "noteOff");
		expect(noteOffEvents).toHaveLength(1);
		expect(noteOffEvents[0].payload).toMatchObject({ note: 60 });
	});

	it("sends sustain engine event when pedal state changes", () => {
		const { result } = renderNoteHandling();

		act(() => result.current.setSustain(true));
		act(() => result.current.setSustain(false));

		const sustainEvents = events.filter((e) => e.type === "sustain");
		expect(sustainEvents).toEqual([
			expect.objectContaining({ payload: { on: true } }),
			expect.objectContaining({ payload: { on: false } }),
		]);
	});

	// ---------------------------------------------------------------------------
	// Sustain pedal — still-held note must not get a spurious noteOff
	// ---------------------------------------------------------------------------

	it("does not send noteOff for a note still physically held when sustain is released", () => {
		const { result } = renderNoteHandling();

		act(() => {
			result.current.sendNoteOn(60);
			result.current.setSustain(true);
			// 60 is NOT released — still held
			result.current.setSustain(false);
		});

		const noteOffEvents = events.filter((e) => e.type === "noteOff");
		expect(noteOffEvents).toHaveLength(0);
	});

	// ---------------------------------------------------------------------------
	// Sustain pedal — retrigger same note regression (mirrors processor.rs test)
	// ---------------------------------------------------------------------------

	/**
	 * Regression test for the "sustain stuck" bug:
	 *   1. Note on  (note 60)
	 *   2. Sustain on
	 *   3. Note off  → queued in sustainedButReleased, NOT forwarded yet
	 *   4. Note on again (same note 60) → re-enters activeNotes
	 *   5. Sustain off → the old queued noteOff should NOT be forwarded because
	 *      the note is now physically held again; only one noteOff after the final
	 *      note-off should fire.
	 */
	it("does not send a spurious noteOff on sustain release when the same note was retriggered", () => {
		const { result } = renderNoteHandling();

		act(() => {
			result.current.sendNoteOn(60);
			result.current.setSustain(true);
			result.current.sendNoteOff(60); // held-down tracking released
			result.current.sendNoteOn(60); // re-struck while pedal is down
			result.current.setSustain(false); // release sustain
		});

		// The note is still held (activeNotes), so no noteOff should have been sent yet.
		const noteOffBeforeFinalRelease = events.filter(
			(e) => e.type === "noteOff",
		);
		expect(noteOffBeforeFinalRelease).toHaveLength(0);

		// Now physically release the note.
		act(() => result.current.sendNoteOff(60));

		const noteOffEvents = events.filter((e) => e.type === "noteOff");
		expect(noteOffEvents).toHaveLength(1);
		expect(noteOffEvents[0].payload).toMatchObject({ note: 60 });
	});

	it("releases multiple different notes correctly when sustain is lifted", () => {
		const { result } = renderNoteHandling();

		act(() => {
			result.current.sendNoteOn(60);
			result.current.sendNoteOn(64);
			result.current.setSustain(true);
			result.current.sendNoteOff(60);
			result.current.sendNoteOff(64);
			result.current.setSustain(false);
		});

		const noteOffNotes = events
			.filter((e) => e.type === "noteOff")
			.map((e) => e.payload.note);
		expect(noteOffNotes).toHaveLength(2);
		expect(noteOffNotes).toContain(60);
		expect(noteOffNotes).toContain(64);
	});
});
