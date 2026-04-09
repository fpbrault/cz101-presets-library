/// <reference types="vite/client" />

import "@testing-library/jest-dom/vitest";
import { beforeEach, vi } from "vitest";
import "./src/App.css";

// Mock the webmidi module
vi.mock("webmidi", () => ({
	WebMidi: {
		enabled: false,
		inputs: [],
		outputs: [],
		enable: vi.fn().mockResolvedValue(undefined),
		addListener: vi.fn(),
		removeListener: vi.fn(),
		getInputByName: vi.fn().mockReturnValue(undefined),
		getOutputByName: vi.fn().mockReturnValue(undefined),
	},
}));

// Mock the MIDIAccess object
const mockMIDIAccess = {
	inputs: new Map(),
	outputs: new Map(),
	onstatechange: null,
};

// Global mock for navigator.requestMIDIAccess
vi.stubGlobal("navigator", {
	...navigator,
	userAgent: navigator.userAgent,
	requestMIDIAccess: vi.fn().mockResolvedValue(mockMIDIAccess),
});

beforeEach(() => {
	document.body.innerHTML = "";
});
