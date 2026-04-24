import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { KnobView } from "./KnobView";

describe("KnobView", () => {
	it("renders thin track by default and thicker track on hover", () => {
		const { container, rerender } = render(
			<KnobView normalizedValue={0.5} size={56} hovered={false} />,
		);

		const track = container.querySelector(
			'path[stroke="var(--knob-track-color)"]',
		);
		expect(track).toHaveAttribute("stroke-width", "2");

		rerender(<KnobView normalizedValue={0.5} size={56} hovered={true} />);
		expect(track).toHaveAttribute("stroke-width", "5");
	});

	it("renders modulation trail as smooth arc segments", () => {
		const { container } = render(
			<KnobView
				normalizedValue={0.45}
				modulatedNorm={0.8}
				size={56}
				modTrailDuration={240}
			/>,
		);

		expect(
			container.querySelector('path[stroke-width="2.5"]'),
		).toBeInTheDocument();
		expect(
			container.querySelector('path[stroke-width="1.45"]'),
		).toBeInTheDocument();
		expect(
			container.querySelector(
				'circle[fill="var(--knob-value-color)"][fill-opacity="0.95"]',
			),
		).toBeInTheDocument();
	});

	it("does not render modulation trail when modulatedNorm is absent", () => {
		const { container } = render(<KnobView normalizedValue={0.5} size={56} />);

		expect(container.querySelector('path[stroke-width="2.5"]')).toBeNull();
		expect(container.querySelector('path[stroke-width="1.45"]')).toBeNull();
	});

	it("applies color override CSS variables", () => {
		const { container } = render(
			<KnobView normalizedValue={0.4} size={56} colorOverride="#00ffff" />,
		);

		const root = container.firstElementChild as HTMLElement;
		expect(root.style.getPropertyValue("--knob-value-color")).toBe("#00ffff");
		expect(root.style.getPropertyValue("--knob-indicator-color")).toBe(
			"#00ffff",
		);
	});

	it("guards against invalid numeric inputs without undefined SVG attributes", () => {
		const { container } = render(
			<KnobView
				normalizedValue={Number.NaN}
				modulatedNorm={Number.NaN}
				size={56}
			/>,
		);

		expect(container.innerHTML).not.toContain("undefined");
		expect(container.querySelector("svg")).toBeInTheDocument();
	});
});
