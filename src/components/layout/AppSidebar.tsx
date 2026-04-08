import { useQuery } from "@tanstack/react-query";
import type React from "react";
import {
	FaBolt,
	FaChevronLeft,
	FaChevronRight,
	FaCopy,
	FaDatabase,
	FaFolderOpen,
	FaListUl,
	FaTags,
} from "react-icons/fa";
import MidiQuickSettings from "@/components/layout/MidiQuickSettings";
import SettingsPanel from "@/components/layout/SettingsPanel";
import { useSidebarContentSlot } from "@/context/SidebarContext";
import {
	fetchPresetData,
	normalizeSysexForLibrary,
} from "@/lib/presets/presetManager";

export type AppMode =
	| "presets"
	| "synthBackups"
	| "setlists"
	| "tagManager"
	| "duplicateFinder";

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

	const { data: duplicatePresets = [] } = useQuery({
		queryKey: ["presets", "sidebar-duplicate-indicator"],
		queryFn: async () => {
			const result = await fetchPresetData(
				0,
				Number.MAX_SAFE_INTEGER,
				[],
				"",
				[],
				"inclusive",
				false,
				false,
				0,
				true,
				false,
			);
			return result.presets;
		},
		refetchOnWindowFocus: false,
	});

	const getDuplicateFingerprint = (sysexData: Uint8Array): string => {
		const normalized = normalizeSysexForLibrary(sysexData);
		const framed =
			normalized[0] === 0xf0 && normalized[normalized.length - 1] === 0xf7
				? normalized
				: new Uint8Array([0xf0, ...normalized, 0xf7]);

		for (let offset = 5; offset <= 16; offset++) {
			if (framed.length >= offset + 256 + 1) {
				const payload = framed.slice(offset, offset + 256);
				if (payload.every((byte) => byte >= 0x00 && byte <= 0x0f)) {
					return `payload:${Array.from(payload).join(",")}`;
				}
			}
		}

		return `canonical:${Array.from(framed).join(",")}`;
	};

	const duplicateGroupCount = new Set(
		duplicatePresets.map((preset) => getDuplicateFingerprint(preset.sysexData)),
	).size;
	const hasDuplicates = duplicateGroupCount > 0;

	const iconNavButtonClass =
		"group relative grid size-9 place-items-center text-base-content/55 transition-colors hover:text-warning";
	const activeIconNavButtonClass =
		"text-warning after:absolute after:-left-3 after:h-5 after:w-0.5 after:rounded-full after:bg-warning";
	const expandedNavButtonClass =
		"group relative flex w-full items-center gap-3 rounded-md px-1 py-1.5 text-sm font-semibold text-base-content/55 transition-colors hover:text-warning";
	const activeExpandedNavButtonClass =
		"text-warning after:absolute after:-left-3 after:h-5 after:w-0.5 after:rounded-full after:bg-warning";

	const switchMode = (mode: AppMode) => {
		setPerformanceMode(false);
		setAppMode(mode);
	};

	return (
		<div
			className={
				"relative flex flex-col h-full gap-3 p-3 bg-base-200 transition-all duration-200 border-r border-base-content/10 " +
				(leftPanelCollapsed ? "w-20 min-w-20" : "w-80 min-w-80")
			}
		>
			{/* Logo */}
			<div className="mb-1 flex items-center justify-start gap-2 pl-1">
				<button
					type="button"
					onClick={() => setLeftPanelCollapsed((prev) => !prev)}
					className="transition-transform duration-150 hover:scale-[1.03] active:scale-[0.98]"
					aria-label={
						leftPanelCollapsed ? "Expand sidebar" : "Collapse sidebar"
					}
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
							<span className="translate-x-[0.08em] tracking-[0.16em]">
								CZX
							</span>
						</div>
					</div>
				</button>
				{!leftPanelCollapsed && (
					<span className="text-sm font-extrabold tracking-wide text-base-content">
						CZ Explorer
					</span>
				)}
			</div>

			{/* Edge chevron indicates collapsible behavior */}
			<button
				type="button"
				onClick={() => setLeftPanelCollapsed((prev) => !prev)}
				className="absolute -right-3 top-12 z-10 grid size-7 place-items-center rounded-full border border-base-content/20 bg-base-100 text-base-content/70 shadow transition-colors hover:bg-base-300 hover:text-base-content"
				aria-label={leftPanelCollapsed ? "Expand sidebar" : "Collapse sidebar"}
				title={leftPanelCollapsed ? "Expand sidebar" : "Collapse sidebar"}
			>
				{leftPanelCollapsed ? (
					<FaChevronRight size={12} />
				) : (
					<FaChevronLeft size={12} />
				)}
			</button>

			{leftPanelCollapsed ? (
				/* Collapsed: icon-only navigation */
				<>
					<div className="flex flex-col items-center gap-3 pt-3">
						<button
							type="button"
							className={`${iconNavButtonClass} ${
								performanceMode ? activeIconNavButtonClass : ""
							}`}
							onClick={() => setPerformanceMode(true)}
							title="Performance Mode"
						>
							<FaBolt size={16} />
						</button>
						<button
							type="button"
							className={`${iconNavButtonClass} ${
								appMode === "presets" && !performanceMode
									? activeIconNavButtonClass
									: ""
							}`}
							onClick={() => switchMode("presets")}
							title="Preset Library"
						>
							<FaFolderOpen size={16} />
						</button>
						<button
							type="button"
							className={`${iconNavButtonClass} ${
								appMode === "synthBackups" && !performanceMode
									? activeIconNavButtonClass
									: ""
							}`}
							onClick={() => switchMode("synthBackups")}
							title="Synth Backup Manager"
						>
							<FaDatabase size={16} />
						</button>
						<button
							type="button"
							className={`${iconNavButtonClass} ${
								appMode === "setlists" && !performanceMode
									? activeIconNavButtonClass
									: ""
							}`}
							onClick={() => switchMode("setlists")}
							title="Setlist Manager"
						>
							<FaListUl size={16} />
						</button>
						<button
							type="button"
							className={`${iconNavButtonClass} ${
								appMode === "tagManager" && !performanceMode
									? activeIconNavButtonClass
									: ""
							}`}
							onClick={() => switchMode("tagManager")}
							title="Tag Manager"
						>
							<FaTags size={16} />
						</button>
						<button
							type="button"
							className={`${iconNavButtonClass} ${
								appMode === "duplicateFinder" && !performanceMode
									? activeIconNavButtonClass
									: ""
							}`}
							onClick={() => switchMode("duplicateFinder")}
							title="Duplicate Finder"
						>
							<FaCopy size={16} />
							{hasDuplicates && (
								<span className="badge badge-error badge-xs absolute -right-1 -top-1 min-h-0 h-3 w-3 p-0" />
							)}
						</button>
					</div>

					<div className="mt-auto flex flex-col items-center gap-3 pb-1">
						<MidiQuickSettings minimalTrigger />
						<SettingsPanel triggerType="login" iconOnly minimalTrigger />
						<SettingsPanel triggerType="settings" iconOnly minimalTrigger />
					</div>
				</>
			) : (
				/* Expanded: full navigation + page-specific slot */
				<>
					<div className="grid grid-cols-1 gap-2 pt-1">
						<button
							type="button"
							className={`${expandedNavButtonClass} ${
								performanceMode ? activeExpandedNavButtonClass : ""
							}`}
							onClick={() => setPerformanceMode(true)}
							title="Performance Mode"
						>
							<FaBolt size={16} />
							<span>Performance</span>
						</button>
						<button
							type="button"
							className={`${expandedNavButtonClass} ${
								appMode === "presets" && !performanceMode
									? activeExpandedNavButtonClass
									: ""
							}`}
							onClick={() => switchMode("presets")}
							title="Preset Library"
						>
							<FaFolderOpen size={16} />
							<span>Preset Library</span>
						</button>
						<button
							type="button"
							className={`${expandedNavButtonClass} ${
								appMode === "synthBackups" && !performanceMode
									? activeExpandedNavButtonClass
									: ""
							}`}
							onClick={() => switchMode("synthBackups")}
							title="Synth Backup Manager"
						>
							<FaDatabase size={16} />
							<span>Synth Backup Manager</span>
						</button>
						<button
							type="button"
							className={`${expandedNavButtonClass} ${
								appMode === "setlists" && !performanceMode
									? activeExpandedNavButtonClass
									: ""
							}`}
							onClick={() => switchMode("setlists")}
							title="Setlist Manager"
						>
							<FaListUl size={16} />
							<span>Setlist Manager</span>
						</button>
						<button
							type="button"
							className={`${expandedNavButtonClass} ${
								appMode === "tagManager" && !performanceMode
									? activeExpandedNavButtonClass
									: ""
							}`}
							onClick={() => switchMode("tagManager")}
							title="Tag Manager"
						>
							<FaTags size={16} />
							<span>Tag Manager</span>
						</button>
						<button
							type="button"
							className={`${expandedNavButtonClass} ${
								appMode === "duplicateFinder" && !performanceMode
									? activeExpandedNavButtonClass
									: ""
							}`}
							onClick={() => switchMode("duplicateFinder")}
							title="Duplicate Finder"
						>
							<FaCopy size={16} />
							<span>Duplicate Finder</span>
							{hasDuplicates && (
								<span className="badge badge-error badge-sm ml-auto">
									{duplicateGroupCount}
								</span>
							)}
						</button>
					</div>

					{/* Page-specific sidebar content slot */}
					<div className="pt-1">{sidebarContent}</div>

					<div className="mt-auto flex items-center justify-between gap-2 pt-2">
						<MidiQuickSettings minimalTrigger />
						<SettingsPanel triggerType="login" iconOnly minimalTrigger />
						<SettingsPanel triggerType="settings" iconOnly minimalTrigger />
					</div>
				</>
			)}
		</div>
	);
}
