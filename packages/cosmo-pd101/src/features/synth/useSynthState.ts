/**
 * useSynthState — thin shim that exposes the Zustand synthStore as a React hook.
 *
 * All consumers that previously called `useSynthState()` continue to work
 * unchanged. The real state now lives in `synthStore.ts` and benefits from
 * Zustand's selective subscriptions: components that call
 * `useSynthStore(s => s.chorusMix)` only re-render when `chorusMix` changes.
 */

import { useSynthStore } from "@/features/synth/synthStore";
import type { PolyMode } from "@/lib/synth/bindings/synth";

export type { PolyMode };

export function useSynthState() {
	return useSynthStore();
}

export type UseSynthStateResult = ReturnType<typeof useSynthState>;
