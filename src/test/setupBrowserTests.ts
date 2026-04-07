import { afterAll, beforeAll } from "vitest";

beforeAll(() => {
	// Any global setup for browser tests
	console.log("Browser testing environment initialized");
});

afterAll(() => {
	// Any global teardown
});
