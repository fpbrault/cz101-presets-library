import { usePluginBridgeSynthEngine } from "@cosmo/cosmo-pd101";
import { useEffect, useRef } from "react";
import { ensureNihPlugBridge } from "@/lib/nihPlugBridge";

export function usePluginParamBridge(): void {
	const bridgeReadyRef = useRef(false);

	useEffect(() => {
		if (bridgeReadyRef.current) {
			return;
		}

		if (ensureNihPlugBridge()) {
			bridgeReadyRef.current = true;
			return;
		}

		const intervalId = window.setInterval(() => {
			if (ensureNihPlugBridge()) {
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
