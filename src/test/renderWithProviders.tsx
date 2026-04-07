import { type RenderOptions, render } from "@testing-library/react";
import type { ReactElement } from "react";
import { TestAppProviders } from "@/test/TestAppProviders";

export function renderWithProviders(
	ui: ReactElement,
	options?: Omit<RenderOptions, "wrapper">,
) {
	return render(ui, {
		wrapper: TestAppProviders,
		...options,
	});
}
