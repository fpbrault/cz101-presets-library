import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

const mockCheckForPluginUpdate = vi.hoisted(() => vi.fn());

vi.mock("./PluginPage", () => ({
	default: ({ utilityExtra }: { utilityExtra?: ReactNode }) => (
		<div data-testid="plugin-page">{utilityExtra}</div>
	),
}));

vi.mock("./update/checkPluginUpdate", () => ({
	checkForPluginUpdate: mockCheckForPluginUpdate,
}));

describe("App", () => {
	beforeEach(() => {
		mockCheckForPluginUpdate.mockReset();
		mockCheckForPluginUpdate.mockResolvedValue(null);
	});

	it("shows update modal and dismisses it when Later is clicked", async () => {
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
