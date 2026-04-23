import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LineSelectControl from "./LineSelectControl";

const useSynthParamMock = vi.fn();

vi.mock("@/features/synth/SynthParamController", () => ({
	useSynthParam: (...args: unknown[]) => useSynthParamMock(...args),
}));

describe("LineSelectControl", () => {
	beforeEach(() => {
		useSynthParamMock.mockReset();
	});

	it("renders all line select buttons", () => {
		useSynthParamMock.mockReturnValue({ value: "L1", setValue: vi.fn() });
		render(<LineSelectControl />);

		expect(screen.getByText("Line Select")).toBeInTheDocument();
		expect(screen.getAllByRole("button")).toHaveLength(5);
	});

	it("calls setValue with selected line", () => {
		const setValue = vi.fn();
		useSynthParamMock.mockReturnValue({ value: "L1", setValue });
		render(<LineSelectControl />);

		fireEvent.click(screen.getAllByRole("button")[3]);
		expect(setValue).toHaveBeenCalledWith("L1+L1'");
	});

	it("marks the active button", () => {
		useSynthParamMock.mockReturnValue({ value: "L2", setValue: vi.fn() });
		render(<LineSelectControl />);

		expect(screen.getAllByRole("button")[2].className).toContain(
			"text-cz-cream",
		);
		expect(screen.getAllByRole("button")[0].className).toContain(
			"text-cz-cream-dim",
		);
	});
});
