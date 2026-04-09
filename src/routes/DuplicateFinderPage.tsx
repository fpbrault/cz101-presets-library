import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import type { AppMode } from "@/components/layout/AppSidebar";
import AppSidebar from "@/components/layout/AppSidebar";
import DuplicateFinderPage from "@/features/presets/components/DuplicateFinderPage";

export default function DuplicateFinderRoutePage() {
	const navigate = useNavigate();
	const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(true);
	const [performanceMode, setPerformanceMode] = useState(false);

	const handleNavigate = (mode: AppMode) => {
		setPerformanceMode(false);
		const routeMap: Record<AppMode, string> = {
			performance: "/performance",
			presets: "/presets",
			synthBackups: "/synth-backups",
			setlists: "/setlists",
			tagManager: "/tags",
			duplicateFinder: "/duplicates",
		};
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		navigate(routeMap[mode] as any);
	};

	return (
		<main className="flex flex-col w-full h-full">
			<div className="flex flex-row h-full overflow-hidden">
				<AppSidebar
					leftPanelCollapsed={leftPanelCollapsed}
					setLeftPanelCollapsed={setLeftPanelCollapsed}
					performanceMode={performanceMode}
					setPerformanceMode={setPerformanceMode}
					appMode="duplicateFinder"
					onNavigate={handleNavigate}
				/>

				<DuplicateFinderPage />
			</div>
		</main>
	);
}
