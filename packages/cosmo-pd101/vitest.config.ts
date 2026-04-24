import path from "node:path";
import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

const packageDir = fileURLToPath(new URL(".", import.meta.url));
const cosmoPd101Src = path.join(packageDir, "src");

export default defineConfig({
	plugins: [react(), tailwindcss()],
	resolve: {
		alias: [{ find: "@", replacement: cosmoPd101Src }],
	},
	test: {
		globals: true,
		projects: [
			{
				extends: true,
				test: {
					name: "unit",
					environment: "happy-dom",
					include: ["src/**/*.{test,spec}.{ts,tsx}"],
					exclude: ["src/**/*.browser.test.{ts,tsx}"],
					setupFiles: ["./src/test/setupTests.ts"],
				},
			},
			{
				extends: true,
				test: {
					name: "browser",
					include: ["src/**/*.browser.test.{ts,tsx}"],
					setupFiles: ["./src/test/setupBrowserTests.ts"],
					browser: {
						enabled: true,
						provider: playwright(),
						instances: [{ browser: "chromium" }],
						screenshotDirectory:
							"../.vitest-attachments/screenshots/cosmo-pd101",
						screenshotFailures: false,
						locators: {
							testIdAttribute: "data-testid",
						},
					},
				},
			},
		],
	},
});