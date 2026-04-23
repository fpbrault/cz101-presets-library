import { fireEvent, render, screen } from "@testing-library/react";
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
	it("adds, edits, and removes routes through the modulation menu", () => {
		render(<ModulationHarness />);

		const modulationButton = screen.getByRole("button", {
			name: /modulation for volume/i,
		});

		fireEvent.click(modulationButton);
		fireEvent.click(screen.getByRole("button", { name: /^LFO 1$/i }));
		expect(modulationButton).toHaveTextContent("1");

		fireEvent.change(screen.getByRole("slider"), {
			target: { value: "0.25" },
		});
		expect(screen.getByText("0.25")).toBeInTheDocument();

		fireEvent.click(screen.getByRole("button", { name: "✕" }));
		expect(modulationButton).toHaveTextContent("+");
	});
});
