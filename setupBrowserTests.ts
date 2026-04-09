/// <reference types="vite/client" />

import "@testing-library/jest-dom/vitest";
import { beforeEach, vi } from "vitest";
import "./src/App.css";

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
