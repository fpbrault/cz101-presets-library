import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
	createMemoryHistory,
	createRouter,
	RouterProvider,
} from "@tanstack/react-router";
import { render } from "vitest-browser-react";
import { MidiChannelProvider } from "@/context/MidiChannelContext";
import { MidiPortProvider } from "@/context/MidiPortContext";
import { SearchFilterProvider } from "@/context/SearchFilterContext";
import { SidebarProvider } from "@/context/SidebarContext";
import { ToastProvider } from "@/context/ToastContext";
import { routeTree } from "@/routes/router";

function createTestQueryClient() {
	return new QueryClient({
		defaultOptions: {
			queries: { retry: false },
			mutations: { retry: false },
		},
	});
}

const FIXTURE_SELECTOR = "[data-vitest-router-fixture]";

/**
 * Renders the full app router at a given initial path.
 * Uses an isolated memory-history router so tests do not affect each other.
 */
export async function routerFixture(initialPath = "/presets") {
	for (const el of document.querySelectorAll(FIXTURE_SELECTOR)) {
		el.remove();
	}

	const container = document.createElement("div");
	container.setAttribute("data-vitest-router-fixture", "true");
	container.style.width = "100vw";
	container.style.height = "100vh";
	document.body.appendChild(container);

	const history = createMemoryHistory({ initialEntries: [initialPath] });
	const router = createRouter({ routeTree, history });

	const queryClient = createTestQueryClient();

	await render(
		<ToastProvider>
			<QueryClientProvider client={queryClient}>
				<MidiPortProvider>
					<MidiChannelProvider>
						<SearchFilterProvider>
							<SidebarProvider>
								<RouterProvider router={router} />
							</SidebarProvider>
						</SearchFilterProvider>
					</MidiChannelProvider>
				</MidiPortProvider>
			</QueryClientProvider>
		</ToastProvider>,
		{ container },
	);

	// Wait for async route loading (lazy imports) deterministically.  
    await router.load();  

	return { container, router };
}
