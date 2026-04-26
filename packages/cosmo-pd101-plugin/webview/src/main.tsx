import { initI18n } from "@cosmo/cosmo-pd101";
import { Component, type ReactNode, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { ensureNihPlugBridge } from "./lib/nihPlugBridge";

function postHostLog(level: "info" | "error", message: string) {
	try {
		window.ipc?.postMessage(
			JSON.stringify({
				id: 0,
				method: "clientLog",
				args: [level, message],
			}),
		);
	} catch {
		// Ignore logging failures in browser/test harness mode.
	}
}

window.addEventListener("error", (event) => {
	const message =
		event.error instanceof Error
			? `${event.error.name}: ${event.error.message}\n${event.error.stack ?? ""}`
			: `${String(event.message)} @ ${event.filename}:${event.lineno}:${event.colno}`;
	postHostLog("error", `window.onerror: ${message}`);
});

window.addEventListener("unhandledrejection", (event) => {
	const reason =
		event.reason instanceof Error
			? (event.reason.stack ?? event.reason.message)
			: String(event.reason);
	postHostLog("error", `unhandledrejection: ${reason}`);
});

// TODO: TEST HARNESS BLOCK — Vite statically eliminates this branch when
// VITE_TEST_HARNESS is not set, so mock modules are excluded from production builds.
const IS_TEST_HARNESS = import.meta.env.VITE_TEST_HARNESS === "1";

initI18n();
postHostLog("info", "main.tsx: initI18n complete");

const root = document.getElementById("root");
if (!root) throw new Error("No #root element found");

type PluginErrorBoundaryState = {
	hasError: boolean;
	errorMessage: string;
};

class PluginErrorBoundary extends Component<
	{ children: ReactNode },
	PluginErrorBoundaryState
> {
	public constructor(props: { children: ReactNode }) {
		super(props);
		this.state = { hasError: false, errorMessage: "" };
	}

	public static getDerivedStateFromError(
		error: unknown,
	): PluginErrorBoundaryState {
		const message =
			error instanceof Error
				? `${error.name}: ${error.message}`
				: "Unknown plugin UI error";
		return { hasError: true, errorMessage: message };
	}

	public componentDidCatch(error: unknown): void {
		const message =
			error instanceof Error
				? `${error.name}: ${error.message}\n${error.stack ?? ""}`
				: String(error);
		postHostLog("error", `PluginErrorBoundary: ${message}`);
	}

	public render(): ReactNode {
		if (this.state.hasError) {
			return (
				<div className="h-dvh w-full bg-cz-panel p-4 text-cz-cream">
					<div className="rounded border border-cz-border bg-black/35 p-3 text-xs font-mono tracking-[0.04em]">
						Plugin UI failed to initialize.
						<br />
						{this.state.errorMessage}
					</div>
				</div>
			);
		}

		return this.props.children;
	}
}

async function init() {
	let RootComponent: React.ComponentType = App;
	postHostLog("info", "main.tsx: init start");

	try {
		const installed = ensureNihPlugBridge();
		postHostLog("info", `main.tsx: ensureNihPlugBridge=${installed}`);
	} catch (error) {
		postHostLog(
			"error",
			`main.tsx: ensureNihPlugBridge threw: ${String(error)}`,
		);
	}

	if (IS_TEST_HARNESS) {
		const [{ installMockPluginBridge }, { default: TestHarness }] =
			await Promise.all([
				import("./test/mockPluginBridge"),
				import("./test/TestHarness"),
			]);
		// Install the mock bridge before React renders so that
		// ensureNihPlugBridge() inside App finds native ipc immediately.
		installMockPluginBridge();
		RootComponent = TestHarness;
	}

	createRoot(root).render(
		<StrictMode>
			<PluginErrorBoundary>
				<RootComponent />
			</PluginErrorBoundary>
		</StrictMode>,
	);
	postHostLog("info", "main.tsx: React render dispatched");
}

void init();
