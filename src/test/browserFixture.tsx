import type { ReactElement } from "react";
import { server } from "vitest/browser";
import { render } from "vitest-browser-react";
import { TestAppProviders } from "@/test/TestAppProviders";

const FIXTURE_SELECTOR = "[data-vitest-browser-fixture]";

function ensureBrowserLocatorConfig() {
	const browserConfig = server.config.browser as {
		locators?: { testIdAttribute?: string };
	};

	browserConfig.locators ??= {};
	browserConfig.locators.testIdAttribute ??= "data-testid";
}

export async function fixture(ui: ReactElement): Promise<HTMLDivElement> {
	ensureBrowserLocatorConfig();

	for (const existingContainer of document.querySelectorAll(FIXTURE_SELECTOR)) {
		existingContainer.remove();
	}

	const container = document.createElement("div");
	container.setAttribute("data-vitest-browser-fixture", "true");
	document.body.appendChild(container);

	await render(<TestAppProviders>{ui}</TestAppProviders>, { container });

	await new Promise((resolve) => requestAnimationFrame(resolve));

	return container;
}