import {
	fireEvent,
	render,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { ModMatrixProvider } from "@/context/ModMatrixContext";
import type { ModMatrix } from "@/lib/synth/bindings/synth";
import ControlKnob from "../ControlKnob";

function ModulationHarness() {
	const [modMatrix, setModMatrix] = useState<ModMatrix>({ routes: [] });
	const [value, setValue] = useState(0.5);

	return (
		<ModMatrixProvider modMatrix={modMatrix} setModMatrix={setModMatrix}>
			<ControlKnob
				label="Volume"
				value={value}
				onChange={setValue}
				min={0}
				max={1}
				modDestination="volume"
			/>
		</ModMatrixProvider>
	);
}

describe("ModulatableControl browser integration", () => {
	it("adds and removes routes through the modulation menu", async () => {
		render(<ModulationHarness />);

		const modulationButton = screen.getByRole("button", {
			name: /modulation for volume/i,
		});

		// Open the panel
		fireEvent.click(modulationButton);

		// Add a route via dropdown + Add button (default source is lfo1)
		fireEvent.click(screen.getByRole("button", { name: /^Add$/i }));
		expect(modulationButton).toHaveTextContent("1");

		// Remove the route
		const dialog = screen.getByRole("dialog", {
			name: /modulation for volume/i,
		});
		const removeButtons = within(dialog).getAllByRole("button", {
			name: "Remove route",
		});
		fireEvent.click(removeButtons[0]);
		await waitFor(() => {
			expect(modulationButton).toHaveTextContent("+");
		});
	});
});
