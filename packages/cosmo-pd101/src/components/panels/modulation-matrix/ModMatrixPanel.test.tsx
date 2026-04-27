import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ModMatrixPanel from "./ModMatrixPanel";

const useModMatrixMock = vi.fn();

vi.mock("motion/react", () => ({
	AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
	motion: {
		div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
			<div {...props}>{children}</div>
		),
	},
}));

vi.mock("@/context/ModMatrixContext", () => ({
	useModMatrix: () => useModMatrixMock(),
}));

vi.mock("@/components/controls/modulation/ModRouteRow", () => ({
	default: () => <div data-testid="mod-route-row" />,
	MOD_SOURCE_META: {
		lfo1: { colorClass: "text-blue-400" },
		lfo2: { colorClass: "text-cyan-400" },
		random: { colorClass: "text-orange-400" },
		modEnv: { colorClass: "text-emerald-400" },
		velocity: { colorClass: "text-yellow-400" },
		modWheel: { colorClass: "text-purple-400" },
		aftertouch: { colorClass: "text-pink-400" },
	},
}));

describe("ModMatrixPanel", () => {
	beforeEach(() => {
		useModMatrixMock.mockReset();
		useModMatrixMock.mockReturnValue({
			modMatrix: { routes: [] },
			setModMatrix: vi.fn(),
		});
	});

	it("shows registry-provided destinations in add-route selector", () => {
		render(<ModMatrixPanel />);

		const destinationSelect = screen.getByLabelText("New route destination");
		fireEvent.focus(destinationSelect);

		expect(
			screen.getByRole("option", { name: "Chorus Rate" }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("option", { name: "L1 DCO Step 1 Level" }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("option", { name: "LFO 2 Symmetry" }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("option", { name: "Random Rate" }),
		).toBeInTheDocument();
	});
});
