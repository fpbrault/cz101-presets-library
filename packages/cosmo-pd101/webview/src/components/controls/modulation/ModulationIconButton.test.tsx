import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ModulationIconButton from "./ModulationIconButton";

describe("ModulationIconButton", () => {
	it("shows plus indicator when no routes", () => {
		render(
			<ModulationIconButton
				hasActiveRoutes={false}
				routeCount={0}
				label="Modulation"
				onClick={vi.fn()}
			/>,
		);
		expect(screen.getByRole("button", { name: "Modulation" })).toHaveTextContent("+");
	});

	it("shows route count and handles click", () => {
		const onClick = vi.fn();
		render(
			<ModulationIconButton
				hasActiveRoutes
				routeCount={3}
				label="Modulation"
				onClick={onClick}
			/>,
		);

		const button = screen.getByRole("button", { name: "Modulation" });
		expect(button).toHaveTextContent("3");
		fireEvent.click(button);
		expect(onClick).toHaveBeenCalledTimes(1);
	});
});
