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
		throw redirect({ to: "/presets" });
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

export const routeTree = rootRoute.addChildren([
	indexRoute,
	presetsRoute,
	performanceRoute,
	synthBackupsRoute,
	setlistsRoute,
	tagsRoute,
	duplicatesRoute,
]);

export const router = createRouter({
	routeTree,
});

declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router;
	}
}

export { RouterProvider };
