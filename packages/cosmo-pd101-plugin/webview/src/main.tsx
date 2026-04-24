import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { initI18n } from "./i18n";
import "./index.css";
import App from "./App";

// TODO: TEST HARNESS BLOCK — Vite statically eliminates this branch when
// VITE_TEST_HARNESS is not set, so mock modules are excluded from production builds.
const IS_TEST_HARNESS = import.meta.env.VITE_TEST_HARNESS === "1";

initI18n();

const root = document.getElementById("root");
if (!root) throw new Error("No #root element found");

async function init() {
	let RootComponent: React.ComponentType = App;

	if (IS_TEST_HARNESS) {
		const [{ installMockPluginBridge }, { default: TestHarness }] =
			await Promise.all([
				import("./test/mockPluginBridge"),
				import("./test/TestHarness"),
			]);
		// Install the mock __BEAMER__ runtime before React renders so that
		// ensureBeamerBridge() inside App finds it immediately.
		installMockPluginBridge();
		RootComponent = TestHarness;
	}

	createRoot(root).render(
		<StrictMode>
			<RootComponent />
		</StrictMode>,
	);
}

void init();
