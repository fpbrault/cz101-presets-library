/**
 * rustReplayContract.ts
 *
 * TypeScript interface contract for the optional Rust/DSP headless-replay path.
 *
 * Strategy (implementation deferred):
 *   1.  A Playwright test session (or dedicated script) records all outbound
 *       MockBridgeMessages to a JSON file via the RustReplaySession helpers.
 *   2.  A Node.js/Bun CLI (scripts/rust-replay.mts, not yet implemented) reads
 *       the session file and feeds actions to the Rust DSP core in CLI mode via
 *       its public Cosmo PD-101 C-ABI.
 *   3.  The CLI captures the DSP output snapshot and compares it against
 *       expected values recorded in the session's expectedSnapshots.
 *
 * No implementation code lives here yet.  The types below define the stable
 * contract that both the TypeScript test-recorder side and the future Rust CLI
 * side must agree on.
 *
 * TODO: Implement scripts/rust-replay.mts once the Rust CLI entrypoint exists.
 */

// ---------------------------------------------------------------------------
// Action format (UI → DSP replay events)
// ---------------------------------------------------------------------------

/** A single recorded UI→host action for replay. */
export type ReplayAction =
	| {
			kind: "param:set";
			/** Beamer numeric param ID. */
			paramId: number;
			/** Normalised value (0–1). */
			normalizedValue: number;
			/** Wall-clock time offset from session start (ms). */
			timeMs: number;
	  }
	| {
			kind: "param:begin";
			paramId: number;
			timeMs: number;
	  }
	| {
			kind: "param:end";
			paramId: number;
			timeMs: number;
	  }
	| {
			kind: "invoke";
			method: string;
			args: unknown[];
			timeMs: number;
	  };

// ---------------------------------------------------------------------------
// Snapshot format (expected DSP state after a sequence of actions)
// ---------------------------------------------------------------------------

/** Expected DSP state snapshot to assert after replaying a set of actions. */
export interface DspStateSnapshot {
	/** Beamer numeric param ID → normalised value at time of snapshot. */
	params: Record<number, number>;
	/** Optional audio sample values (e.g., first 256 samples of a note-on burst). */
	audioSamples?: number[];
	/** Optional oscilloscope hz reading for tuning assertions. */
	scopeHz?: number;
}

// ---------------------------------------------------------------------------
// Session format (the full replay file written to disk)
// ---------------------------------------------------------------------------

/** A complete recorded session that can be played back against the Rust core. */
export interface RustReplaySession {
	/** Semver of the plugin at record time; Rust replay validates compatibility. */
	pluginVersion: string;
	/** ISO-8601 timestamp when the session was recorded. */
	recordedAt: string;
	/** Human-readable description of the session intent. */
	description: string;
	/** Ordered list of actions to replay. */
	actions: ReplayAction[];
	/**
	 * Optional checkpoints: after replaying actions[0..checkpointIndex] the Rust
	 * core must produce the given DSP snapshot.
	 */
	checkpoints?: Array<{
		/** Index (inclusive) in actions[] at which to assert. */
		afterActionIndex: number;
		expected: DspStateSnapshot;
	}>;
}

// ---------------------------------------------------------------------------
// Recorder helper (used in E2E tests to capture sessions)
// ---------------------------------------------------------------------------

/**
 * RustReplayRecorder collects MockBridgeMessages during a test and serialises
 * them to a RustReplaySession file for offline Rust verification.
 *
 * Usage in a Playwright test:
 *
 *   const recorder = new RustReplayRecorder("chorus-rate-sweep", "0.1.0");
 *   // ... interact with the UI ...
 *   const msgs = await page.evaluate(() => window.__MOCK_BRIDGE__?.getMessages());
 *   msgs?.forEach(m => recorder.addMessage(m));
 *   await recorder.save("e2e/fixtures/chorus-rate-sweep.replay.json");
 *
 * TODO: Implement save() once the Node file-system helpers are in place.
 */
export class RustReplayRecorder {
	private readonly actions: ReplayAction[] = [];
	private readonly startMs = Date.now();

	constructor(
		private readonly description: string,
		private readonly pluginVersion: string,
	) {}

	/** Convert a MockBridgeMessage to a ReplayAction and append to the session. */
	addMessage(msg: { type: string; [key: string]: unknown }): void {
		const timeMs = Date.now() - this.startMs;

		if (msg.type === "param:set") {
			this.actions.push({
				kind: "param:set",
				paramId: msg.id as number,
				normalizedValue: msg.value as number,
				timeMs,
			});
		} else if (msg.type === "param:begin") {
			this.actions.push({
				kind: "param:begin",
				paramId: msg.id as number,
				timeMs,
			});
		} else if (msg.type === "param:end") {
			this.actions.push({
				kind: "param:end",
				paramId: msg.id as number,
				timeMs,
			});
		} else if (msg.type === "invoke") {
			this.actions.push({
				kind: "invoke",
				method: msg.method as string,
				args: (msg.args as unknown[]) ?? [],
				timeMs,
			});
		}
	}

	/** Build the session object (does not write to disk). */
	build(): RustReplaySession {
		return {
			pluginVersion: this.pluginVersion,
			recordedAt: new Date().toISOString(),
			description: this.description,
			actions: [...this.actions],
		};
	}

	/**
	 * TODO: Persist the session to a JSON file.
	 * Requires: import { writeFile } from "node:fs/promises"
	 */
	async save(_path: string): Promise<void> {
		throw new Error(
			"RustReplayRecorder.save() is not yet implemented. " +
				"Build the session with .build() and serialise manually for now.",
		);
	}
}
