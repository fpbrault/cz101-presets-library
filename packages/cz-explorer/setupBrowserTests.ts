/// <reference types="vite/client" />
/// <reference types="vitest/globals" />

import "@testing-library/jest-dom/vitest";
import "./src/App.css";

// Mock the MIDIAccess object
const mockMIDIAccess = {
	inputs: new Map(),
	outputs: new Map(),
	onstatechange: null,
};

Object.defineProperty(globalThis.navigator, "requestMIDIAccess", {
	configurable: true,
	value: async () => mockMIDIAccess,
});

beforeEach(() => {
	document.body.innerHTML = "";
});
