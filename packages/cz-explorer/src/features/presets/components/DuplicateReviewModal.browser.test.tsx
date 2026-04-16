import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import DuplicateReviewModal, {
	type DuplicateGroup,
} from "@/features/presets/components/DuplicateReviewModal";
import { fixture } from "@/test/browserFixture";

function makeDuplicateGroup(id: string, names: string[]): DuplicateGroup {
	return {
		fingerprint: `fp-${id}`,
		presets: names.map((name, i) => ({
			id: `${id}-p${i}`,
			name,
			createdDate: "2024-01-01",
			modifiedDate: "2024-01-01",
			filename: `${name.toLowerCase().replace(/\s/g, "-")}.syx`,
			sysexData: new Uint8Array([0xf0, 0x44, i, 0xf7]),
			tags: [],
			author: "Demo",
			description: "",
		})),
	};
}

describe("DuplicateReviewModal (browser)", () => {
	it("renders nothing when isOpen is false", async () => {
		const container = await fixture(
			<DuplicateReviewModal
				isOpen={false}
				groups={[]}
				onClose={vi.fn()}
				onDeletePresets={vi.fn()}
			/>,
		);
		expect(container.firstChild).toBeNull();
	});

	it('shows "No duplicates found" when groups array is empty', async () => {
		await fixture(
			<DuplicateReviewModal
				isOpen={true}
				groups={[]}
				onClose={vi.fn()}
				onDeletePresets={vi.fn()}
			/>,
		);
		expect(screen.getByText(/no duplicates found/i)).toBeTruthy();
	});

	it("shows the correct group and preset counts", async () => {
		const groups = [
			makeDuplicateGroup("a", ["Bass A", "Bass A Copy"]),
			makeDuplicateGroup("b", ["Pad", "Pad 2", "Pad 3"]),
		];
		await fixture(
			<DuplicateReviewModal
				isOpen={true}
				groups={groups}
				onClose={vi.fn()}
				onDeletePresets={vi.fn()}
			/>,
		);
		expect(screen.getByText(/2 duplicate groups/i)).toBeTruthy();
		expect(screen.getByText(/5 total duplicate presets/i)).toBeTruthy();
	});

	it("calls onClose when Close button is clicked", async () => {
		const user = userEvent.setup();
		const onClose = vi.fn();
		await fixture(
			<DuplicateReviewModal
				isOpen={true}
				groups={[]}
				onClose={onClose}
				onDeletePresets={vi.fn()}
			/>,
		);
		await user.click(screen.getByRole("button", { name: "Close" }));
		expect(onClose).toHaveBeenCalledOnce();
	});

	it("selects all except the suggested keep when button clicked", async () => {
		const user = userEvent.setup();
		const onDeletePresets = vi.fn().mockResolvedValue(undefined);
		const groups = [
			makeDuplicateGroup("g1", ["Preset A", "Preset B", "Preset C"]),
		];

		await fixture(
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
		await user.click(
			screen.getByRole("button", { name: /delete selected \(2\)/i }),
		);

		expect(onDeletePresets).toHaveBeenCalledWith(["g1-p1", "g1-p2"]);
	});

	it("keeps the favorited preset when selecting all except suggested keep", async () => {
		const user = userEvent.setup();
		const onDeletePresets = vi.fn().mockResolvedValue(undefined);
		const groups: DuplicateGroup[] = [
			{
				fingerprint: "fp-fav",
				presets: [
					{
						id: "p-unfav",
						name: "Normal",
						createdDate: "2024-01-01",
						modifiedDate: "2024-01-01",
						filename: "normal.syx",
						sysexData: new Uint8Array([0xf0, 0x01, 0xf7]),
						tags: [],
						author: "Demo",
						description: "",
						favorite: false,
					},
					{
						id: "p-fav",
						name: "Favorite One",
						createdDate: "2024-01-01",
						modifiedDate: "2024-01-01",
						filename: "fav.syx",
						sysexData: new Uint8Array([0xf0, 0x01, 0xf7]),
						tags: [],
						author: "Demo",
						description: "",
						favorite: true,
					},
				],
			},
		];

		await fixture(
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

		expect(onDeletePresets).toHaveBeenCalledWith(["p-unfav"]);
	});

	it("clears selection when Clear Selection button is clicked", async () => {
		const user = userEvent.setup();
		const groups = [makeDuplicateGroup("c1", ["Alpha", "Beta"])];

		await fixture(
			<DuplicateReviewModal
				isOpen={true}
				groups={groups}
				onClose={vi.fn()}
				onDeletePresets={vi.fn()}
			/>,
		);

		await user.click(
			screen.getByRole("button", { name: /select all except/i }),
		);
		// Delete button should show count
		expect(
			screen.getByRole("button", { name: /delete selected \(1\)/i }),
		).toBeTruthy();

		await user.click(screen.getByRole("button", { name: /clear selection/i }));
		// After clearing, delete button count goes back to 0
		expect(
			screen.getByRole("button", { name: /delete selected \(0\)/i }),
		).toBeTruthy();
	});

	it("displays the Favorite badge next to favorited presets", async () => {
		const groups: DuplicateGroup[] = [
			{
				fingerprint: "fp-badge",
				presets: [
					{
						id: "p1",
						name: "My Fave",
						createdDate: "2024-01-01",
						modifiedDate: "2024-01-01",
						filename: "fave.syx",
						sysexData: new Uint8Array([0xf0, 0xf7]),
						tags: [],
						author: "Me",
						description: "",
						favorite: true,
					},
					{
						id: "p2",
						name: "Not Fave",
						createdDate: "2024-01-01",
						modifiedDate: "2024-01-01",
						filename: "nf.syx",
						sysexData: new Uint8Array([0xf0, 0xf7]),
						tags: [],
						author: "Me",
						description: "",
						favorite: false,
					},
				],
			},
		];

		await fixture(
			<DuplicateReviewModal
				isOpen={true}
				groups={groups}
				onClose={vi.fn()}
				onDeletePresets={vi.fn()}
			/>,
		);

		expect(screen.getByText("Favorite")).toBeTruthy();
	});
});
