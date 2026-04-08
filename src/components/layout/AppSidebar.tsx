import type React from "react";
import SettingsPanel from "@/components/layout/SettingsPanel";
import Button from "@/components/ui/Button";
import { useSidebarContentSlot } from "@/context/SidebarContext";

export type AppMode = "presets" | "synthBackups" | "setlists";

interface AppSidebarProps {
	leftPanelCollapsed: boolean;
	setLeftPanelCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
	performanceMode: boolean;
	setPerformanceMode: React.Dispatch<React.SetStateAction<boolean>>;
	appMode: AppMode;
	setAppMode: React.Dispatch<React.SetStateAction<AppMode>>;
}

export default function AppSidebar({
	leftPanelCollapsed,
	setLeftPanelCollapsed,
	performanceMode,
	setPerformanceMode,
	appMode,
	setAppMode,
}: AppSidebarProps) {
	const sidebarContent = useSidebarContentSlot();

	const switchMode = (mode: AppMode) => {
		setAppMode(mode);
		setPerformanceMode(false);
	};

	return (
		<div
			className={
				"relative flex flex-col h-full gap-2 p-3 bg-base-200 transition-all duration-200 border-r border-base-content/10 " +
				(leftPanelCollapsed ? "w-14 min-w-14" : "w-64 min-w-64")
			}
		>
			{/* Logo / collapse toggle */}
			<div className="mb-2 flex justify-center">
				<button
					type="button"
					onClick={() => setLeftPanelCollapsed((prev) => !prev)}
					className="transition-transform duration-150 hover:scale-[1.03] active:scale-[0.98]"
					aria-label={leftPanelCollapsed ? "Expand sidebar" : "Collapse sidebar"}
					title={leftPanelCollapsed ? "Expand sidebar" : "Collapse sidebar"}
				>
					<div
						className={
							"grid place-items-center rounded-xl border border-warning/40 bg-linear-to-br from-warning/25 via-accent/20 to-primary/25 p-0.5 shadow-sm shadow-base-content/10 " +
							(leftPanelCollapsed ? "size-8" : "size-10")
						}
					>
						<div
							className={
								"flex size-full flex-col items-center justify-center rounded-[0.65rem] bg-base-200 font-black italic uppercase leading-none text-warning " +
								(leftPanelCollapsed ? "text-[0.54rem]" : "text-[0.66rem]")
							}
						>
							<span className="translate-x-[0.08em] tracking-[0.16em]">CZX</span>
						</div>
					</div>
				</button>
			</div>

			{leftPanelCollapsed ? (
				/* Collapsed: icon-only navigation */
				<div className="flex flex-col items-center gap-2 pt-1">
					<Button
						variant={performanceMode ? "warning" : "secondary"}
						size="sm"
						className="w-full text-[10px]"
						onClick={() => setPerformanceMode((prev) => !prev)}
						title={performanceMode ? "Exit Performance Mode" : "Performance Mode"}
					>
						PM
					</Button>
					<Button
						variant={
							appMode === "presets" && !performanceMode ? "accent" : "secondary"
						}
						size="sm"
						className="w-full text-[10px]"
						onClick={() => switchMode("presets")}
						title="Presets"
					>
						P
					</Button>
					<Button
						variant={
							appMode === "synthBackups" && !performanceMode
								? "accent"
								: "secondary"
						}
						size="sm"
						className="w-full text-[10px]"
						onClick={() => switchMode("synthBackups")}
						title="Synth Backups"
					>
						B
					</Button>
					<Button
						variant={
							appMode === "setlists" && !performanceMode ? "accent" : "secondary"
						}
						size="sm"
						className="w-full text-[10px]"
						onClick={() => switchMode("setlists")}
						title="Setlists"
					>
						S
					</Button>
				</div>
			) : (
				/* Expanded: full navigation + page-specific slot */
				<>
					<Button
						variant={performanceMode ? "warning" : "secondary"}
						size="lg"
						onClick={() => setPerformanceMode((prev) => !prev)}
					>
						{performanceMode ? "Exit Performance Mode" : "Performance Mode"}
					</Button>

					<div className="grid grid-cols-1 gap-2">
						<Button
							variant={
								appMode === "presets" && !performanceMode ? "accent" : "secondary"
							}
							onClick={() => switchMode("presets")}
						>
							Presets
						</Button>
						<Button
							variant={
								appMode === "synthBackups" && !performanceMode
									? "accent"
									: "secondary"
							}
							onClick={() => switchMode("synthBackups")}
						>
							Synth Backups
						</Button>
						<Button
							variant={
								appMode === "setlists" && !performanceMode
									? "accent"
									: "secondary"
							}
							onClick={() => switchMode("setlists")}
						>
							Setlists
						</Button>
					</div>

					{/* Page-specific sidebar content slot */}
					{sidebarContent}

					<SettingsPanel />
				</>
			)}
		</div>
	);
}
