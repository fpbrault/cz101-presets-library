import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ModulationMenu from "./ModulationMenu";

const routes = [
	{ source: "lfo1", destination: "volume", amount: 0.5, enabled: true },
	{ source: "modWheel", destination: "volume", amount: -0.2, enabled: false },
] as const;

describe("ModulationMenu", () => {
	it("renders routes with labels and values", () => {
		render(
			<ModulationMenu
				title="Volume"
				routes={[...routes]}
				onToggleEnabled={vi.fn()}
				onRemoveRoute={vi.fn()}
				onAmountChange={vi.fn()}
				onAddRoute={vi.fn()}
				onClose={vi.fn()}
			/>,
		);

		expect(screen.getByText("Volume")).toBeInTheDocument();
		expect(screen.getByText("LFO 1")).toBeInTheDocument();
		expect(screen.getByText("Mod Wheel")).toBeInTheDocument();
		expect(screen.getByText("0.50")).toBeInTheDocument();
	});

	it("dispatches route actions", () => {
		const onToggleEnabled = vi.fn();
		const onRemoveRoute = vi.fn();
		const onAmountChange = vi.fn();
		const onClose = vi.fn();
		render(
			<ModulationMenu
				title="Volume"
				routes={[...routes]}
				onToggleEnabled={onToggleEnabled}
				onRemoveRoute={onRemoveRoute}
				onAmountChange={onAmountChange}
				onAddRoute={vi.fn()}
				onClose={onClose}
			/>,
		);

		fireEvent.click(screen.getAllByRole("checkbox")[0]);
		fireEvent.click(screen.getAllByRole("button", { name: "✕" })[1]);
		fireEvent.change(screen.getAllByRole("slider")[0], {
			target: { value: "0.25" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Close" }));

		expect(onToggleEnabled).toHaveBeenCalledWith(0);
		expect(onRemoveRoute).toHaveBeenCalledWith(1);
		expect(onAmountChange).toHaveBeenCalledWith(0, 0.25);
		expect(onClose).toHaveBeenCalledTimes(1);
	});

	it("dispatches add source actions", () => {
		const onAddRoute = vi.fn();
		render(
			<ModulationMenu
				title="Volume"
				routes={[]}
				onToggleEnabled={vi.fn()}
				onRemoveRoute={vi.fn()}
				onAmountChange={vi.fn()}
				onAddRoute={onAddRoute}
				onClose={vi.fn()}
			/>,
		);

		fireEvent.click(screen.getByRole("button", { name: "Velocity" }));
		expect(onAddRoute).toHaveBeenCalledWith("velocity");
	});
});
