import { expect } from "vitest";
import { configureAxe } from "vitest-axe";

const axe = configureAxe({
	rules: {
		region: { enabled: false },
	},
});

export async function expectNoAxeViolations(container: Element) {
	const results = await axe(container);
	expect(results.violations).toEqual([]);
}
