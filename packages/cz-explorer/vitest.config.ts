import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

const cosmoPd101Src = fileURLToPath(
	new URL("../cosmo-pd101/webview/src", import.meta.url),
);
const cosmoPresetCoreSrc = fileURLToPath(
	new URL("../cosmo-preset-core/src", import.meta.url),
);
const explorerSrc = fileURLToPath(new URL("./src", import.meta.url));

const synthFileAliases = [
	"context/ModMatrixContext",
	"components/pdAlgorithms",
	"components/SingleCycleDisplay",
	"components/ControlKnob",
	"components/BaseFxSection",
	"components/ChorusSection",
	"components/DelaySection",
	"components/ReverbSection",
	"components/StepEnvelopeEditor",
	"components/PerLineWarpBlock",
	"components/AlgoControlsGroup",
	"components/AlgoControlItem",
	"components/AlgoControlNumber",
	"components/AlgoControlSelect",
	"components/AlgoControlToggle",
	"components/AlgoControlTooltip",
	"components/algoControlTypes",
	"components/AlgoIconGrid",
	"components/ui/ModulatableControl",
	"components/ui/ModulationMenu",
	"components/ui/ModulationIconButton",
	"components/ui/CzHorizontalSlider",
	"components/ui/CzVerticalSlider",
	"components/ui/Card",
	"components/ui/CzButton",
	"components/ui/CzTabButton",
	"lib/synth/algoRef",
	"lib/synth/modDestination",
	"lib/synth/defaultPresets",
	"lib/synth/pdVisualizerWorkletUrl",
	"lib/synth/drawOscilloscope",
	"lib/synth/pdOscillator",
	"lib/synth/windowFunction",
].map((relPath) => ({ find: `@/${relPath}`, replacement: `${cosmoPd101Src}/${relPath}` }));

const synthDirAliases = ["@/components/synth", "@/features/synth"].map(
	(prefix) => ({
		find: new RegExp(`^${prefix.replace("/", "\\/").replace("@", "@")}(/|$)`),
		replacement: `${cosmoPd101Src}/${prefix.slice(2)}/`,
	}),
);

export default defineConfig({
	resolve: {
		alias: [
			...synthDirAliases,
			...synthFileAliases,
			{ find: "@/lib/synth/presetStorage", replacement: `${cosmoPresetCoreSrc}/presetStorage` },
			{ find: "@/lib/synth/czPresetConverter", replacement: `${cosmoPresetCoreSrc}/czPresetConverter` },
			{ find: "@", replacement: explorerSrc },
		],
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
						screenshotDirectory:
							"../.vitest-attachments/screenshots/cz-explorer",
						screenshotFailures: false,
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
