import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import GlobalVoicePanel from "./GlobalVoicePanel";

const useSynthParamMock = vi.fn();

vi.mock("@/features/synth/SynthParamController", () => ({
	useSynthParam: (key: string) => useSynthParamMock(key),
}));

vi.mock("@/components/controls/ControlKnob", () => ({
	default: ({ label }: { label?: string }) => <div>{label}</div>,
}));

describe("GlobalVoicePanel", () => {
	const setters = new Map<string, ReturnType<typeof vi.fn>>();
	const values = new Map<string, unknown>();

	beforeEach(() => {
		setters.clear();
		values.clear();
		values.set("polyMode", "poly8");
		values.set("velocityTarget", "amp");
		values.set("pitchBendRange", 2);
		values.set("portamentoEnabled", false);
		values.set("portamentoMode", "rate");
		values.set("portamentoRate", 50);
		values.set("portamentoTime", 0.5);
		useSynthParamMock.mockImplementation((key: string) => {
			const setValue = vi.fn();
			setters.set(key, setValue);
			return { value: values.get(key), setValue };
		});
	});

	it("groups voice mode, portamento, and bend range controls", () => {
		render(<GlobalVoicePanel />);

		expect(screen.getByText("Voice Mode")).toBeInTheDocument();
		expect(screen.getByText("Poly 8")).toBeInTheDocument();
		expect(screen.getByText("Mono")).toBeInTheDocument();
		expect(screen.getByText("Portamento")).toBeInTheDocument();
		expect(screen.getAllByText("Rate")).toHaveLength(2);
		expect(screen.getByText("Time")).toBeInTheDocument();
		expect(screen.getByText("Bend")).toBeInTheDocument();
	});

	it("does not render master volume or mod wheel vibrato controls", () => {
		render(<GlobalVoicePanel />);

		expect(screen.queryByText("Volume")).not.toBeInTheDocument();
		expect(screen.queryByText("Mod→Vib")).not.toBeInTheDocument();
	});

	it("updates portamento controls", () => {
		render(<GlobalVoicePanel />);
		const buttons = screen.getAllByRole("button");

		fireEvent.click(buttons[2]);
		fireEvent.click(buttons[4]);

		expect(setters.get("portamentoEnabled")).toHaveBeenCalledWith(true);
		expect(setters.get("portamentoMode")).toHaveBeenCalledWith("time");
	});
});
