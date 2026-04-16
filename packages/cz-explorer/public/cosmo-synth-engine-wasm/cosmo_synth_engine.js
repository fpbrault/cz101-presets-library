let wasm_bindgen = (function(exports) {
    let script_src;
    if (typeof document !== 'undefined' && document.currentScript !== null) {
        script_src = new URL(document.currentScript.src, location.href).toString();
    }

    /**
     * WebAssembly wrapper around [`Cz101Processor`].
     *
     * All public methods map 1-to-1 to the messages the AudioWorklet receives
     * from the main thread so the JS worklet shim stays minimal.
     */
    class CzSynthProcessor {
        __destroy_into_raw() {
            const ptr = this.__wbg_ptr;
            this.__wbg_ptr = 0;
            CzSynthProcessorFinalization.unregister(this);
            return ptr;
        }
        free() {
            const ptr = this.__destroy_into_raw();
            wasm.__wbg_czsynthprocessor_free(ptr, 0);
        }
        /**
         * Create a new processor at the given sample rate.
         * @param {number} sample_rate
         */
        constructor(sample_rate) {
            const ret = wasm.czsynthprocessor_new(sample_rate);
            this.__wbg_ptr = ret >>> 0;
            CzSynthProcessorFinalization.register(this, this.__wbg_ptr, this);
            return this;
        }
        /**
         * Trigger a note-off event.
         * @param {number} note
         */
        noteOff(note) {
            wasm.czsynthprocessor_noteOff(this.__wbg_ptr, note);
        }
        /**
         * Trigger a note-on event.
         *
         * * `note`      — MIDI note number (0-127)
         * * `frequency` — Hz; pass `0.0` to auto-compute from the MIDI note number
         * * `velocity`  — normalised 0.0-1.0
         * @param {number} note
         * @param {number} frequency
         * @param {number} velocity
         */
        noteOn(note, frequency, velocity) {
            wasm.czsynthprocessor_noteOn(this.__wbg_ptr, note, frequency, velocity);
        }
        /**
         * Fill `output` with mono samples rendered by the DSP engine.
         *
         * The caller passes a `Float32Array` slice backed by WASM linear memory.
         * The entire slice is filled; returns nothing — same as the JS worklet
         * `process()` contract.
         * @param {Float32Array} output
         */
        process(output) {
            var ptr0 = passArrayF32ToWasm0(output, wasm.__wbindgen_export);
            var len0 = WASM_VECTOR_LEN;
            wasm.czsynthprocessor_process(this.__wbg_ptr, ptr0, len0, addHeapObject(output));
        }
        /**
         * Set mod wheel value. `value` is normalised [0.0, 1.0] (CC1 / 127).
         * @param {number} value
         */
        setModWheel(value) {
            wasm.czsynthprocessor_setModWheel(this.__wbg_ptr, value);
        }
        /**
         * Replace all synthesis parameters from a JSON string.
         *
         * The caller serializes `SynthParams` with `JSON.stringify` and passes
         * the result here; we parse it with `serde_json` on the Rust side.
         * @param {string} json
         */
        setParams(json) {
            const ptr0 = passStringToWasm0(json, wasm.__wbindgen_export, wasm.__wbindgen_export2);
            const len0 = WASM_VECTOR_LEN;
            wasm.czsynthprocessor_setParams(this.__wbg_ptr, ptr0, len0);
        }
        /**
         * Set pitch bend. `value` is normalised [-1.0, 1.0] (MIDI 14-bit mapped to this range).
         * Actual pitch shift in semitones = value * params.pitchBendRange.
         * @param {number} value
         */
        setPitchBend(value) {
            wasm.czsynthprocessor_setPitchBend(this.__wbg_ptr, value);
        }
        /**
         * Set the sustain (damper) pedal state.
         * @param {boolean} on
         */
        setSustain(on) {
            wasm.czsynthprocessor_setSustain(this.__wbg_ptr, on);
        }
    }
    if (Symbol.dispose) CzSynthProcessor.prototype[Symbol.dispose] = CzSynthProcessor.prototype.free;
    exports.CzSynthProcessor = CzSynthProcessor;

    function __wbg_get_imports() {
        const import0 = {
            __proto__: null,
            __wbg___wbindgen_copy_to_typed_array_a4db337751e0b328: function(arg0, arg1, arg2) {
                new Uint8Array(getObject(arg2).buffer, getObject(arg2).byteOffset, getObject(arg2).byteLength).set(getArrayU8FromWasm0(arg0, arg1));
            },
            __wbg___wbindgen_throw_81fc77679af83bc6: function(arg0, arg1) {
                throw new Error(getStringFromWasm0(arg0, arg1));
            },
            __wbg_error_38bec0a78dd8ded8: function(arg0) {
                console.error(getObject(arg0));
            },
            __wbindgen_cast_0000000000000001: function(arg0, arg1) {
                // Cast intrinsic for `Ref(String) -> Externref`.
                const ret = getStringFromWasm0(arg0, arg1);
                return addHeapObject(ret);
            },
            __wbindgen_object_drop_ref: function(arg0) {
                takeObject(arg0);
            },
        };
        return {
            __proto__: null,
            "./cosmo_synth_engine_bg.js": import0,
        };
    }

    const CzSynthProcessorFinalization = (typeof FinalizationRegistry === 'undefined')
        ? { register: () => {}, unregister: () => {} }
        : new FinalizationRegistry(ptr => wasm.__wbg_czsynthprocessor_free(ptr >>> 0, 1));

    function addHeapObject(obj) {
        if (heap_next === heap.length) heap.push(heap.length + 1);
        const idx = heap_next;
        heap_next = heap[idx];

        heap[idx] = obj;
        return idx;
    }

    function dropObject(idx) {
        if (idx < 1028) return;
        heap[idx] = heap_next;
        heap_next = idx;
    }

    function getArrayU8FromWasm0(ptr, len) {
        ptr = ptr >>> 0;
        return getUint8ArrayMemory0().subarray(ptr / 1, ptr / 1 + len);
    }

    let cachedFloat32ArrayMemory0 = null;
    function getFloat32ArrayMemory0() {
        if (cachedFloat32ArrayMemory0 === null || cachedFloat32ArrayMemory0.byteLength === 0) {
            cachedFloat32ArrayMemory0 = new Float32Array(wasm.memory.buffer);
        }
        return cachedFloat32ArrayMemory0;
    }

    function getStringFromWasm0(ptr, len) {
        ptr = ptr >>> 0;
        return decodeText(ptr, len);
    }

    let cachedUint8ArrayMemory0 = null;
    function getUint8ArrayMemory0() {
        if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
            cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
        }
        return cachedUint8ArrayMemory0;
    }

    function getObject(idx) { return heap[idx]; }

    let heap = new Array(1024).fill(undefined);
    heap.push(undefined, null, true, false);

    let heap_next = heap.length;

    function passArrayF32ToWasm0(arg, malloc) {
        const ptr = malloc(arg.length * 4, 4) >>> 0;
        getFloat32ArrayMemory0().set(arg, ptr / 4);
        WASM_VECTOR_LEN = arg.length;
        return ptr;
    }

    function passStringToWasm0(arg, malloc, realloc) {
        if (realloc === undefined) {
            const buf = cachedTextEncoder.encode(arg);
            const ptr = malloc(buf.length, 1) >>> 0;
            getUint8ArrayMemory0().subarray(ptr, ptr + buf.length).set(buf);
            WASM_VECTOR_LEN = buf.length;
            return ptr;
        }

        let len = arg.length;
        let ptr = malloc(len, 1) >>> 0;

        const mem = getUint8ArrayMemory0();

        let offset = 0;

        for (; offset < len; offset++) {
            const code = arg.charCodeAt(offset);
            if (code > 0x7F) break;
            mem[ptr + offset] = code;
        }
        if (offset !== len) {
            if (offset !== 0) {
                arg = arg.slice(offset);
            }
            ptr = realloc(ptr, len, len = offset + arg.length * 3, 1) >>> 0;
            const view = getUint8ArrayMemory0().subarray(ptr + offset, ptr + len);
            const ret = cachedTextEncoder.encodeInto(arg, view);

            offset += ret.written;
            ptr = realloc(ptr, len, offset, 1) >>> 0;
        }

        WASM_VECTOR_LEN = offset;
        return ptr;
    }

    function takeObject(idx) {
        const ret = getObject(idx);
        dropObject(idx);
        return ret;
    }

    let cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
    cachedTextDecoder.decode();
    function decodeText(ptr, len) {
        return cachedTextDecoder.decode(getUint8ArrayMemory0().subarray(ptr, ptr + len));
    }

    const cachedTextEncoder = new TextEncoder();

    if (!('encodeInto' in cachedTextEncoder)) {
        cachedTextEncoder.encodeInto = function (arg, view) {
            const buf = cachedTextEncoder.encode(arg);
            view.set(buf);
            return {
                read: arg.length,
                written: buf.length
            };
        };
    }

    let WASM_VECTOR_LEN = 0;

    let wasmModule, wasm;
    function __wbg_finalize_init(instance, module) {
        wasm = instance.exports;
        wasmModule = module;
        cachedFloat32ArrayMemory0 = null;
        cachedUint8ArrayMemory0 = null;
        return wasm;
    }

    async function __wbg_load(module, imports) {
        if (typeof Response === 'function' && module instanceof Response) {
            if (typeof WebAssembly.instantiateStreaming === 'function') {
                try {
                    return await WebAssembly.instantiateStreaming(module, imports);
                } catch (e) {
                    const validResponse = module.ok && expectedResponseType(module.type);

                    if (validResponse && module.headers.get('Content-Type') !== 'application/wasm') {
                        console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);

                    } else { throw e; }
                }
            }

            const bytes = await module.arrayBuffer();
            return await WebAssembly.instantiate(bytes, imports);
        } else {
            const instance = await WebAssembly.instantiate(module, imports);

            if (instance instanceof WebAssembly.Instance) {
                return { instance, module };
            } else {
                return instance;
            }
        }

        function expectedResponseType(type) {
            switch (type) {
                case 'basic': case 'cors': case 'default': return true;
            }
            return false;
        }
    }

    function initSync(module) {
        if (wasm !== undefined) return wasm;


        if (module !== undefined) {
            if (Object.getPrototypeOf(module) === Object.prototype) {
                ({module} = module)
            } else {
                console.warn('using deprecated parameters for `initSync()`; pass a single object instead')
            }
        }

        const imports = __wbg_get_imports();
        if (!(module instanceof WebAssembly.Module)) {
            module = new WebAssembly.Module(module);
        }
        const instance = new WebAssembly.Instance(module, imports);
        return __wbg_finalize_init(instance, module);
    }

    async function __wbg_init(module_or_path) {
        if (wasm !== undefined) return wasm;


        if (module_or_path !== undefined) {
            if (Object.getPrototypeOf(module_or_path) === Object.prototype) {
                ({module_or_path} = module_or_path)
            } else {
                console.warn('using deprecated parameters for the initialization function; pass a single object instead')
            }
        }

        if (module_or_path === undefined && script_src !== undefined) {
            module_or_path = script_src.replace(/\.js$/, "_bg.wasm");
        }
        const imports = __wbg_get_imports();

        if (typeof module_or_path === 'string' || (typeof Request === 'function' && module_or_path instanceof Request) || (typeof URL === 'function' && module_or_path instanceof URL)) {
            module_or_path = fetch(module_or_path);
        }

        const { instance, module } = await __wbg_load(await module_or_path, imports);

        return __wbg_finalize_init(instance, module);
    }

    return Object.assign(__wbg_init, { initSync }, exports);
})({ __proto__: null });
