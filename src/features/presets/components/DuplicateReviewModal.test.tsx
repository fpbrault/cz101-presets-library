import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import DuplicateReviewModal, {
	type DuplicateGroup,
} from "@/features/presets/components/DuplicateReviewModal";
import { expectNoAxeViolations } from "@/test/accessibility";
import { renderWithProviders } from "@/test/renderWithProviders";

describe("DuplicateReviewModal", () => {
	it("has no accessibility violations", async () => {
		const groups: DuplicateGroup[] = [
			{
				fingerprint: "fp-1",
				presets: [
					{
						id: "p1",
						name: "Bass A",
						createdDate: "2021-01-01",
						modifiedDate: "2021-01-01",
						filename: "a.syx",
						sysexData: new Uint8Array([1, 2, 3]),
						tags: ["bass"],
						author: "Demo",
						description: "",
					},
					{
						id: "p2",
						name: "Bass A Copy",
						createdDate: "2021-01-01",
						modifiedDate: "2021-01-01",
						filename: "b.syx",
						sysexData: new Uint8Array([1, 2, 3]),
						tags: ["bass"],
						author: "Demo",
						description: "",
					},
				],
			},
		];

		const { container } = renderWithProviders(
			<DuplicateReviewModal
				isOpen={true}
				groups={groups}
				onClose={vi.fn()}
				onDeletePresets={vi.fn().mockResolvedValue(undefined)}
			/>,
		);

		await expectNoAxeViolations(container);
	});

	it("selects all except suggested keep and deletes selected", async () => {
		const user = userEvent.setup();
		const onDeletePresets = vi.fn().mockResolvedValue(undefined);

		const groups: DuplicateGroup[] = [
			{
				fingerprint: "fp-1",
				presets: [
					{
						id: "p1",
						name: "Bass A",
						createdDate: "2021-01-01",
						modifiedDate: "2021-01-01",
						filename: "a.syx",
						sysexData: new Uint8Array([1, 2, 3]),
						tags: ["bass"],
						author: "Demo",
						description: "",
					},
					{
						id: "p2",
						name: "Bass A Copy",
						createdDate: "2021-01-01",
						modifiedDate: "2021-01-01",
						filename: "b.syx",
						sysexData: new Uint8Array([1, 2, 3]),
						tags: ["bass"],
						author: "Demo",
						description: "",
					},
				],
			},
		];

		renderWithProviders(
			<DuplicateReviewModal
				isOpen={true}
				groups={groups}
				onClose={vi.fn()}
				onDeletePresets={onDeletePresets}
			/>,
		);

		await user.click(
			screen.getByRole("button", { name: /select all except/i }),
		);
		await user.click(screen.getByRole("button", { name: /delete selected/i }));

		expect(onDeletePresets).toHaveBeenCalledWith(["p2"]);
	});

	it("keeps favorited preset when selecting all except suggested keep", async () => {
		const user = userEvent.setup();
		const onDeletePresets = vi.fn().mockResolvedValue(undefined);

		const groups: DuplicateGroup[] = [
			{
				fingerprint: "fp-2",
				presets: [
					{
						id: "p1",
						name: "Pad A",
						createdDate: "2021-01-01",
						modifiedDate: "2021-01-01",
						filename: "pad-a.syx",
						sysexData: new Uint8Array([9, 9, 9]),
						tags: ["pad"],
						author: "Demo",
						description: "",
						favorite: false,
					},
					{
						id: "p2",
						name: "Pad A Favorite",
						createdDate: "2021-01-01",
						modifiedDate: "2021-01-01",
						filename: "pad-a-fav.syx",
						sysexData: new Uint8Array([9, 9, 9]),
						tags: ["pad"],
						author: "Demo",
						description: "",
						favorite: true,
					},
				],
			},
		];

		renderWithProviders(
			<DuplicateReviewModal
				isOpen={true}
				groups={groups}
				onClose={vi.fn()}
				onDeletePresets={onDeletePresets}
			/>,
		);

		await user.click(
			screen.getByRole("button", { name: /select all except/i }),
		);
		await user.click(screen.getByRole("button", { name: /delete selected/i }));

		expect(onDeletePresets).toHaveBeenCalledWith(["p1"]);
	});
});
