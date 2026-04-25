declare namespace wasm_bindgen {
    /* tslint:disable */
    /* eslint-disable */

    /**
     * WebAssembly wrapper around [`CosmoProcessor`].
     *
     * All public methods map 1-to-1 to the messages the AudioWorklet receives
     * from the main thread so the JS worklet shim stays minimal.
     */
    export class CzSynthProcessor {
        free(): void;
        [Symbol.dispose](): void;
        /**
         * Return the latest runtime modulation-source values as JSON for UI telemetry.
         */
        getRuntimeModSources(): string;
        /**
         * Create a new processor at the given sample rate.
         */
        constructor(sample_rate: number);
        /**
         * Trigger a note-off event.
         */
        noteOff(note: number): void;
        /**
         * Trigger a note-on event.
         *
         * * `note`      — MIDI note number (0-127)
         * * `frequency` — Hz; pass `0.0` to auto-compute from the MIDI note number
         * * `velocity`  — normalised 0.0-1.0
         */
        noteOn(note: number, frequency: number, velocity: number): void;
        /**
         * Fill `output` with mono samples rendered by the DSP engine.
         *
         * The caller passes a `Float32Array` slice backed by WASM linear memory.
         * The entire slice is filled; returns nothing — same as the JS worklet
         * `process()` contract.
         */
        process(output: Float32Array): void;
        /**
         * Set aftertouch/channel pressure value. `value` is normalised [0.0, 1.0].
         */
        setAftertouch(value: number): void;
        /**
         * Set mod wheel value. `value` is normalised [0.0, 1.0] (CC1 / 127).
         */
        setModWheel(value: number): void;
        /**
         * Replace all synthesis parameters from a JSON string.
         *
         * The caller serializes `SynthParams` with `JSON.stringify` and passes
         * the result here; we parse it with `serde_json` on the Rust side.
         */
        setParams(json: string): void;
        /**
         * Set pitch bend. `value` is normalised [-1.0, 1.0] (MIDI 14-bit mapped to this range).
         * Actual pitch shift in semitones = value * params.pitchBendRange.
         */
        setPitchBend(value: number): void;
        /**
         * Set the sustain (damper) pedal state.
         */
        setSustain(on: boolean): void;
    }

}
declare type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

declare interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_czsynthprocessor_free: (a: number, b: number) => void;
    readonly czsynthprocessor_getRuntimeModSources: (a: number, b: number) => void;
    readonly czsynthprocessor_new: (a: number) => number;
    readonly czsynthprocessor_noteOff: (a: number, b: number) => void;
    readonly czsynthprocessor_noteOn: (a: number, b: number, c: number, d: number) => void;
    readonly czsynthprocessor_process: (a: number, b: number, c: number, d: number) => void;
    readonly czsynthprocessor_setAftertouch: (a: number, b: number) => void;
    readonly czsynthprocessor_setModWheel: (a: number, b: number) => void;
    readonly czsynthprocessor_setParams: (a: number, b: number, c: number) => void;
    readonly czsynthprocessor_setPitchBend: (a: number, b: number) => void;
    readonly czsynthprocessor_setSustain: (a: number, b: number) => void;
    readonly __wbindgen_add_to_stack_pointer: (a: number) => number;
    readonly __wbindgen_export: (a: number, b: number, c: number) => void;
    readonly __wbindgen_export2: (a: number, b: number) => number;
    readonly __wbindgen_export3: (a: number, b: number, c: number, d: number) => number;
}

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
declare function wasm_bindgen (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
