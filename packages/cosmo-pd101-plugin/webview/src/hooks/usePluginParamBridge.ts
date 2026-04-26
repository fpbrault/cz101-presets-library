import { usePluginBridgeSynthEngine } from "@cosmo/cosmo-pd101";
import { useEffect, useRef } from "react";
import { ensureNihPlugBridge } from "@/lib/nihPlugBridge";

function ensurePluginBridge(): boolean {
	try {
		return ensureNihPlugBridge();
	} catch (error) {
		console.error("[pluginBridge] ensureNihPlugBridge failed", error);
		return false;
	}
}

export function usePluginParamBridge(): void {
	const bridgeReadyRef = useRef(false);

	useEffect(() => {
		if (bridgeReadyRef.current) {
			return;
		}

		if (ensurePluginBridge()) {
			bridgeReadyRef.current = true;
			return;
		}

		const intervalId = window.setInterval(() => {
			if (ensurePluginBridge()) {
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
