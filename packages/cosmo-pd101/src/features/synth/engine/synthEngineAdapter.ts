import { useEffect } from "react";
import type { SynthEngineSnapshot } from "./synthEngineSnapshot";

export type SynthEngineAdapter = {
	sync: (snapshot: SynthEngineSnapshot) => void;
	connect?: () => (() => void) | undefined;
};

export class SynthEngineController {
	private disconnect: (() => void) | undefined;

	constructor(private readonly adapter: SynthEngineAdapter) {}

	connect() {
		if (!this.adapter.connect) return;
		const cleanup = this.adapter.connect();
		if (typeof cleanup === "function") {
			this.disconnect = cleanup;
		}
	}

	sync(snapshot: SynthEngineSnapshot) {
		this.adapter.sync(snapshot);
	}

	dispose() {
		this.disconnect?.();
		this.disconnect = undefined;
	}
}

type UseSynthEngineControllerParams = {
	adapter: SynthEngineAdapter;
	snapshot: SynthEngineSnapshot;
};

export function useSynthEngineController({
	adapter,
	snapshot,
}: UseSynthEngineControllerParams) {
	useEffect(() => {
		const controller = new SynthEngineController(adapter);
		controller.connect();
		return () => {
			controller.dispose();
		};
	}, [adapter]);

	useEffect(() => {
		adapter.sync(snapshot);
	}, [adapter, snapshot]);
}
