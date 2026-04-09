import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { routerFixture } from "@/test/routerFixture";

describe("Sidebar navigation (browser)", () => {
	it("renders the sidebar nav buttons", async () => {
		await routerFixture("/presets");
		expect(screen.getByTitle("Preset Library")).toBeTruthy();
		expect(screen.getByTitle("Performance Mode")).toBeTruthy();
		expect(screen.getByTitle("Synth Backup Manager")).toBeTruthy();
		expect(screen.getByTitle("Setlist Manager")).toBeTruthy();
		expect(screen.getByTitle("Tag Manager")).toBeTruthy();
		expect(screen.getByTitle("Duplicate Finder")).toBeTruthy();
	});

	it("navigates to /performance when Performance button is clicked", async () => {
		const user = userEvent.setup();
		const { router } = await routerFixture("/presets");

		await user.click(screen.getByTitle("Performance Mode"));

		await waitFor(() => {
			expect(router.state.location.pathname).toBe("/performance");
		});
	});

	it("navigates to /synth-backups when Synth Backup Manager button is clicked", async () => {
		const user = userEvent.setup();
		const { router } = await routerFixture("/presets");

		await user.click(screen.getByTitle("Synth Backup Manager"));

		await waitFor(() => {
			expect(router.state.location.pathname).toBe("/synth-backups");
		});
	});

	it("navigates to /setlists when Setlist Manager button is clicked", async () => {
		const user = userEvent.setup();
		const { router } = await routerFixture("/presets");

		await user.click(screen.getByTitle("Setlist Manager"));

		await waitFor(() => {
			expect(router.state.location.pathname).toBe("/setlists");
		});
	});

	it("navigates to /tags when Tag Manager button is clicked", async () => {
		const user = userEvent.setup();
		const { router } = await routerFixture("/presets");

		await user.click(screen.getByTitle("Tag Manager"));

		await waitFor(() => {
			expect(router.state.location.pathname).toBe("/tags");
		});
	});

	it("navigates to /duplicates when Duplicate Finder button is clicked", async () => {
		const user = userEvent.setup();
		const { router } = await routerFixture("/presets");

		await user.click(screen.getByTitle("Duplicate Finder"));

		await waitFor(() => {
			expect(router.state.location.pathname).toBe("/duplicates");
		});
	});

	it("navigates back to /presets from another page", async () => {
		const user = userEvent.setup();
		const { router } = await routerFixture("/setlists");

		await user.click(screen.getByTitle("Preset Library"));

		await waitFor(() => {
			expect(router.state.location.pathname).toBe("/presets");
		});
	});

	it("/ redirects to /presets", async () => {
		const { router } = await routerFixture("/");

		await waitFor(() => {
			expect(router.state.location.pathname).toBe("/presets");
		});
	});
});
