import {
	act,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

const mockEnsureBeamerLegacyBridge = vi.hoisted(() => vi.fn());
const mockCheckForPluginUpdate = vi.hoisted(() => vi.fn());

vi.mock("./PluginPage", () => ({
	default: ({ headerExtra }: { headerExtra?: ReactNode }) => (
		<div data-testid="plugin-page">{headerExtra}</div>
	),
}));

vi.mock("./lib/beamerLegacyBridge", () => ({
	ensureBeamerLegacyBridge: mockEnsureBeamerLegacyBridge,
}));

vi.mock("./update/checkPluginUpdate", () => ({
	checkForPluginUpdate: mockCheckForPluginUpdate,
}));

describe("App", () => {
	beforeEach(() => {
		mockEnsureBeamerLegacyBridge.mockReset();
		mockEnsureBeamerLegacyBridge.mockReturnValue(true);
		mockCheckForPluginUpdate.mockReset();
		mockCheckForPluginUpdate.mockResolvedValue(null);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("polls for the legacy bridge until it becomes ready", () => {
		vi.useFakeTimers();
		mockEnsureBeamerLegacyBridge
			.mockReturnValueOnce(false)
			.mockReturnValueOnce(true);

		const { unmount } = render(<App />);
		expect(mockEnsureBeamerLegacyBridge).toHaveBeenCalledTimes(1);

		act(() => {
			vi.advanceTimersByTime(50);
		});

		expect(mockEnsureBeamerLegacyBridge).toHaveBeenCalledTimes(2);
		unmount();
	});

	it("shows and dismisses an available update from the initial check", async () => {
		mockCheckForPluginUpdate.mockResolvedValueOnce({
			currentVersion: "0.1.0",
			latestVersion: "0.2.0",
			releaseUrl: "https://example.com/releases/v0.2.0",
		});

		render(<App />);

		expect(
			await screen.findByText("New Version Available"),
		).toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "Later" }));
		await waitFor(() => {
			expect(
				screen.queryByText("New Version Available"),
			).not.toBeInTheDocument();
		});
	});

	it("shows an up-to-date message when a manual check finds no update", async () => {
		mockCheckForPluginUpdate
			.mockResolvedValueOnce(null)
			.mockResolvedValueOnce(null);

		render(<App />);
		fireEvent.click(screen.getByRole("button", { name: /check updates/i }));

		await waitFor(() => {
			expect(mockCheckForPluginUpdate).toHaveBeenNthCalledWith(2, {
				manual: true,
			});
		});
		expect(await screen.findByText("You are up to date.")).toBeInTheDocument();
	});
});
