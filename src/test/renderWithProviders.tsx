import { render } from "@testing-library/react";
import type { ComponentType, ReactElement, ReactNode } from "react";
import { TestAppProviders } from "@/test/TestAppProviders";

export function renderWithProviders(
	ui: ReactElement,
	options?: { wrapper?: ComponentType<{ children?: ReactNode }> },
) {
	return render(ui, {
		wrapper: TestAppProviders,
		...options,
	});
}
