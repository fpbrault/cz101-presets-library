import { useState } from "react";
import { useNavigate } from "react-router";
import type { AppMode } from "@/components/layout/AppSidebar";
import AppSidebar from "@/components/layout/AppSidebar";
import TagManagerPage from "@/features/presets/components/TagManagerPage";

export default function TagManagerRoutePage() {
	const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(true);
	const [performanceMode, setPerformanceMode] = useState(false);

	const navigate = useNavigate();

	const handleNavigate = (mode: AppMode) => {
		setPerformanceMode(false);
		const routeMap: Record<AppMode, string> = {
			presets: "presets",
			synthBackups: "synth-backups",
			setlists: "setlists",
			tagManager: "tags",
			duplicateFinder: "duplicates",
		};
		navigate(`/${routeMap[mode]}`);
	};

	return (
		<main className="flex flex-col w-full h-full">
			<div className="flex flex-row h-full overflow-hidden">
				<AppSidebar
					leftPanelCollapsed={leftPanelCollapsed}
					setLeftPanelCollapsed={setLeftPanelCollapsed}
					performanceMode={performanceMode}
					setPerformanceMode={setPerformanceMode}
					appMode="tagManager"
					onNavigate={handleNavigate}
				/>

				<TagManagerPage />
			</div>
		</main>
	);
}
