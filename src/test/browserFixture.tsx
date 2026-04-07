import type { ReactElement } from "react";
import { render } from "vitest-browser-react";
import { TestAppProviders } from "@/test/TestAppProviders";

const FIXTURE_SELECTOR = "[data-vitest-browser-fixture]";

export async function fixture(ui: ReactElement): Promise<HTMLDivElement> {
	for (const existingContainer of document.querySelectorAll(FIXTURE_SELECTOR)) {
		existingContainer.remove();
	}

	const container = document.createElement("div");
	container.setAttribute("data-vitest-browser-fixture", "true");
	document.body.appendChild(container);

	render(<TestAppProviders>{ui}</TestAppProviders>, { container });

	await new Promise((resolve) => requestAnimationFrame(resolve));

	return container;
}