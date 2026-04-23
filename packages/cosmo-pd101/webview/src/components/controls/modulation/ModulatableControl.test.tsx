import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ModulatableControl from "./ModulatableControl";

const useModMatrixMock = vi.fn();
const modulationIconPropsSpy = vi.fn();
const modulationMenuPropsSpy = vi.fn();

vi.mock("@/context/ModMatrixContext", () => ({
	useModMatrix: () => useModMatrixMock(),
}));

vi.mock("./ModulationIconButton", () => ({
	default: (props: Record<string, unknown>) => {
		modulationIconPropsSpy(props);
		return (
			<button type="button" onClick={props.onClick as () => void}>
				icon
			</button>
		);
	},
}));

vi.mock("./ModulationMenu", () => ({
	default: (props: Record<string, unknown>) => {
		modulationMenuPropsSpy(props);
		return (
			<div data-testid="modulation-menu">
				<button type="button" onClick={props.onClose as () => void}>
					close menu
				</button>
			</div>
		);
	},
}));

describe("ModulatableControl", () => {
	beforeEach(() => {
		useModMatrixMock.mockReset();
		modulationIconPropsSpy.mockReset();
		modulationMenuPropsSpy.mockReset();
	});

	it("passes active route count for destination to icon", () => {
		useModMatrixMock.mockReturnValue({
			modMatrix: {
				routes: [
					{ source: "lfo1", destination: "volume", amount: 0.4, enabled: true },
					{ source: "velocity", destination: "volume", amount: 0.2, enabled: true },
					{ source: "modWheel", destination: "line1Level", amount: 0.3, enabled: true },
				],
			},
			setModMatrix: vi.fn(),
		});

		render(
			<ModulatableControl destinationId="volume" label="Volume">
				<div>child</div>
			</ModulatableControl>,
		);

		const props = modulationIconPropsSpy.mock.calls[0][0] as {
			hasActiveRoutes: boolean;
			routeCount: number;
			label: string;
		};
		expect(props.hasActiveRoutes).toBe(true);
		expect(props.routeCount).toBe(2);
		expect(props.label).toBe("Modulation for Volume");
	});

	it("opens menu and supports route mutations", () => {
		const setModMatrix = vi.fn();
		useModMatrixMock.mockReturnValue({
			modMatrix: {
				routes: [
					{ source: "lfo1", destination: "volume", amount: 0.4, enabled: true },
					{ source: "modWheel", destination: "line1Level", amount: 0.3, enabled: true },
				],
			},
			setModMatrix,
		});

		render(
			<ModulatableControl destinationId="volume" label="Volume">
				<div>child</div>
			</ModulatableControl>,
		);

		fireEvent.click(screen.getByRole("button", { name: "icon" }));
		expect(screen.getByTestId("modulation-menu")).toBeInTheDocument();

		const menuProps = modulationMenuPropsSpy.mock.calls[0][0] as {
			onAddRoute: (source: "velocity") => void;
			onToggleEnabled: (index: number) => void;
			onAmountChange: (index: number, amount: number) => void;
			onRemoveRoute: (index: number) => void;
		};
		menuProps.onAddRoute("velocity");
		menuProps.onToggleEnabled(0);
		menuProps.onAmountChange(0, 0.9);
		menuProps.onRemoveRoute(0);

		expect(setModMatrix).toHaveBeenCalledTimes(4);
	});
});
