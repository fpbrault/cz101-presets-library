import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ModModeControl from "./ModModeControl";

const useSynthParamMock = vi.fn();

vi.mock("@/features/synth/SynthParamController", () => ({
	useSynthParam: (...args: unknown[]) => useSynthParamMock(...args),
}));

describe("ModModeControl", () => {
	beforeEach(() => {
		useSynthParamMock.mockReset();
	});

	it("renders modulation mode buttons", () => {
		useSynthParamMock.mockReturnValue({ value: "normal", setValue: vi.fn() });
		render(<ModModeControl />);

		expect(screen.getByText("Modulation")).toBeInTheDocument();
		expect(screen.getAllByRole("button")).toHaveLength(3);
	});

	it("calls setValue when selecting a mode", () => {
		const setValue = vi.fn();
		useSynthParamMock.mockReturnValue({ value: "normal", setValue });
		render(<ModModeControl />);

		fireEvent.click(screen.getAllByRole("button")[2]);
		expect(setValue).toHaveBeenCalledWith("noise");
	});

	it("marks active mode button", () => {
		useSynthParamMock.mockReturnValue({ value: "ring", setValue: vi.fn() });
		render(<ModModeControl />);

		expect(screen.getAllByRole("button")[1].className).toContain("text-cz-cream");
		expect(screen.getAllByRole("button")[0].className).toContain(
			"text-cz-cream-dim",
		);
	});
});
