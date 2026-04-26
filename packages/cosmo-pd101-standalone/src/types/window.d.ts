declare global {
	interface Window {
		__czOnScope?: (samples: number[], sampleRate: number, hz: number) => void;
	}
}

export {};
