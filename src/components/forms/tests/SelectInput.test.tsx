import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import SelectInput from "@/components/forms/SelectInput";
import { renderWithProviders } from "@/test/renderWithProviders";

describe("SelectInput", () => {
	it("renders options and selected value", () => {
		renderWithProviders(
			<SelectInput value="internal" onChange={() => undefined}>
				<option value="internal">Internal</option>
				<option value="cartridge">Cartridge</option>
			</SelectInput>,
		);

		expect((screen.getByRole("combobox") as HTMLSelectElement).value).toBe(
			"internal",
		);
	});

	it("applies size and custom classes", () => {
		renderWithProviders(
			<SelectInput
				value="a"
				onChange={() => undefined}
				selectSize="sm"
				className="max-w-xs"
			>
				<option value="a">A</option>
			</SelectInput>,
		);

		const select = screen.getByRole("combobox");
		expect(select.className).toContain("select-sm");
		expect(select.className).toContain("max-w-xs");
	});

	it("applies large size class", () => {
		renderWithProviders(
			<SelectInput value="a" onChange={() => undefined} selectSize="lg">
				<option value="a">A</option>
			</SelectInput>,
		);

		const select = screen.getByRole("combobox");
		expect(select.className).toContain("select-lg");
	});

	it("applies medium size class by default", () => {
		renderWithProviders(
			<SelectInput value="a" onChange={() => undefined}>
				<option value="a">A</option>
			</SelectInput>,
		);

		const select = screen.getByRole("combobox");
		expect(select.className).toContain("select-md");
	});
});
