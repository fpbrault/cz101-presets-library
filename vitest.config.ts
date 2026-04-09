import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

export default defineConfig({
	resolve: {
		alias: {
			"@": fileURLToPath(new URL("./src", import.meta.url)),
		},
	},
	plugins: [tailwindcss()],
	test: {
		globals: true,
		setupFiles: ["./setupTests.ts"],
		coverage: {
			provider: "v8",
			reporter: ["text", "json", "html"],
		},
		projects: [
			{
				extends: true,
				test: {
					name: "unit",
					environment: "happy-dom",
					include: ["src/**/*.{test,spec}.{ts,tsx}"],
					exclude: ["src/**/*.browser.test.{ts,tsx}"],
				},
			},
			{
				extends: true,
				test: {
					css: true,
					name: "browser",
					browser: {
						enabled: true,
						locators: {
							testIdAttribute: "data-testid",
						},
						provider: playwright(),
						instances: [{ browser: "chromium" }],
					},
					include: ["src/**/*.browser.test.{ts,tsx}"],
					setupFiles: ["./setupBrowserTests.ts"],
				},
			},
		],
	},
});
