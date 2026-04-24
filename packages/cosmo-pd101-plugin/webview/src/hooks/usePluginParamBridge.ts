import { usePluginBridgeSynthEngine } from "@cosmo/cosmo-pd101";
import { useEffect, useRef } from "react";
import { ensureBeamerBridge } from "@/lib/beamerBridge";

export function usePluginParamBridge(): void {
	const bridgeReadyRef = useRef(false);

	useEffect(() => {
		if (bridgeReadyRef.current) {
			return;
		}

		if (ensureBeamerBridge()) {
			bridgeReadyRef.current = true;
			return;
		}

		const intervalId = window.setInterval(() => {
			if (ensureBeamerBridge()) {
				bridgeReadyRef.current = true;
				window.clearInterval(intervalId);
			}
		}, 50);

		return () => {
			window.clearInterval(intervalId);
		};
	}, []);

	usePluginBridgeSynthEngine();
}
