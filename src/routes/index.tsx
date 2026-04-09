import { lazy, Suspense } from "react";
import { Outlet, redirect } from "react-router";

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

export const routes = [
	{
		path: "/",
		element: <Outlet />,
		children: [
			{ index: true, loader: () => redirect("/presets") },
			{
				path: "presets",
				element: (
					<Suspense fallback={<PageLoader />}>
						<PresetsPage />
					</Suspense>
				),
			},
			{
				path: "performance",
				element: (
					<Suspense fallback={<PageLoader />}>
						<PerformancePage />
					</Suspense>
				),
			},
			{
				path: "synth-backups",
				element: (
					<Suspense fallback={<PageLoader />}>
						<SynthBackupsPage />
					</Suspense>
				),
			},
			{
				path: "setlists",
				element: (
					<Suspense fallback={<PageLoader />}>
						<SetlistsPage />
					</Suspense>
				),
			},
			{
				path: "tags",
				element: (
					<Suspense fallback={<PageLoader />}>
						<TagManagerPage />
					</Suspense>
				),
			},
			{
				path: "duplicates",
				element: (
					<Suspense fallback={<PageLoader />}>
						<DuplicateFinderPage />
					</Suspense>
				),
			},
		],
	},
];
