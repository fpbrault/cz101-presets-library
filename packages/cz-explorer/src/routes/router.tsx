import {
	createRootRoute,
	createRoute,
	createRouter,
	Outlet,
	RouterProvider,
	redirect,
} from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import AppLayout from "@/components/layout/AppLayout";

const PresetsPage = lazy(() => import("./PresetsPage"));
const PerformancePage = lazy(() => import("./PerformancePage"));
const SynthBackupsPage = lazy(() => import("./SynthBackupsPage"));
const SetlistsPage = lazy(() => import("./SetlistsPage"));
const TagManagerPage = lazy(() => import("./TagManagerPage"));
const DuplicateFinderPage = lazy(() => import("./DuplicateFinderPage"));
const VisualizerPage = lazy(() => import("./VisualizerPage"));

function PageLoader() {
	return (
		<div className="flex items-center justify-center h-full">
			<span className="loading loading-spinner loading-lg" />
		</div>
	);
}

function RootLayout() {
	return (
		<AppLayout>
			<Suspense fallback={<PageLoader />}>
				<Outlet />
			</Suspense>
		</AppLayout>
	);
}

const rootRoute = createRootRoute({
	component: RootLayout,
});

const indexRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/",
	beforeLoad: () => {
		// biome-ignore lint/suspicious/noExplicitAny: Redirect path typing issue in TanStack Router
		throw redirect({ to: "/presets" } as any);
	},
});

const presetsRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/presets",
	component: PresetsPage,
});

const performanceRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/performance",
	component: PerformancePage,
});

const synthBackupsRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/synth-backups",
	component: SynthBackupsPage,
});

const setlistsRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/setlists",
	component: SetlistsPage,
});

const tagsRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/tags",
	component: TagManagerPage,
});

const duplicatesRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/duplicates",
	component: DuplicateFinderPage,
});

const visualizerRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/lab",
	component: VisualizerPage,
});

// Conditionally include synth routes based on environment
// When VITE_HIDE_SYNTH_ROUTES is true, synth routes (/performance, /lab) are excluded
// This is useful for desktop builds that only include the preset library
const baseRouteChildren = [
	indexRoute,
	presetsRoute,
	synthBackupsRoute,
	setlistsRoute,
	tagsRoute,
	duplicatesRoute,
] as const;

const synthRouteChildren = [performanceRoute, visualizerRoute] as const;

const routeChildren =
	import.meta.env.VITE_HIDE_SYNTH_ROUTES !== "true"
		? [...baseRouteChildren, ...synthRouteChildren]
		: baseRouteChildren;

// biome-ignore lint/suspicious/noExplicitAny: Conditional route children typing requires any
export const routeTree = rootRoute.addChildren(routeChildren as any);

export const router = createRouter({
	routeTree,
});

declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router;
	}
}

export { RouterProvider };
