import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ModRoute } from "@/lib/synth/bindings/synth";
import ModulationIconButton from "./ModulationIconButton";
import ModulationMenu from "./ModulationMenu";

const routes: ModRoute[] = [
	{ source: "lfo1", destination: "volume", amount: 0.5, enabled: true },
	{ source: "modWheel", destination: "volume", amount: -0.2, enabled: false },
];

describe("modulation controls (browser)", () => {
	it("renders ModulationIconButton states", () => {
		const onClick = vi.fn();
		const { rerender } = render(
			<ModulationIconButton
				hasActiveRoutes={false}
				routeCount={0}
				label="Modulation"
				onClick={onClick}
			/>,
		);

		const button = screen.getByRole("button", { name: "Modulation" });
		expect(button).toHaveTextContent("+");
		fireEvent.click(button);
		expect(onClick).toHaveBeenCalledTimes(1);

		rerender(
			<ModulationIconButton
				hasActiveRoutes
				routeCount={2}
				label="Modulation"
				onClick={onClick}
			/>,
		);
		expect(screen.getByRole("button", { name: "Modulation" })).toHaveTextContent("2");
	});

	it("renders ModulationMenu route management actions", () => {
		const onToggleEnabled = vi.fn();
		const onRemoveRoute = vi.fn();
		const onAmountChange = vi.fn();
		const onAddRoute = vi.fn();
		const onClose = vi.fn();
		render(
			<ModulationMenu
				title="Volume"
				routes={[...routes]}
				onToggleEnabled={onToggleEnabled}
				onRemoveRoute={onRemoveRoute}
				onAmountChange={onAmountChange}
				onAddRoute={onAddRoute}
				onClose={onClose}
			/>,
		);

		expect(screen.getAllByText("LFO 1")).toHaveLength(2);
		fireEvent.click(screen.getAllByRole("checkbox")[0]);
		fireEvent.click(screen.getAllByRole("button", { name: "✕" })[0]);
		fireEvent.change(screen.getAllByRole("slider")[0], {
			target: { value: "0.25" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Velocity" }));
		fireEvent.click(screen.getByRole("button", { name: "Close" }));

		expect(onToggleEnabled).toHaveBeenCalledWith(0);
		expect(onRemoveRoute).toHaveBeenCalledWith(0);
		expect(onAmountChange).toHaveBeenCalledWith(0, 0.25);
		expect(onAddRoute).toHaveBeenCalledWith("velocity");
		expect(onClose).toHaveBeenCalledTimes(1);
	});
});
