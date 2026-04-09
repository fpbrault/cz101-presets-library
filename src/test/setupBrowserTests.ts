import { beforeAll, vi } from "vitest";

vi.mock("webmidi", () => ({
	WebMidi: {
		enabled: false,
		enable: vi.fn().mockResolvedValue(undefined),
		addListener: vi.fn(),
		removeListener: vi.fn(),
	},
}));

beforeAll(() => {
	console.log("Browser testing environment initialized");
});
