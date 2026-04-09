import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import type { AppMode } from "@/components/layout/AppSidebar";
import AppSidebar from "@/components/layout/AppSidebar";
import PerformanceMode from "@/components/presets/PerformanceMode";
import { useMidiChannel } from "@/context/MidiChannelContext";
import { useMidiPort } from "@/context/MidiPortContext";
import { usePresetMode } from "@/features/presets/hooks/usePresetMode";
import { useMidiSetup } from "@/hooks/useMidiSetup";
import type { Preset } from "@/lib/presets/presetManager";
import { getPresetById } from "@/lib/presets/presetManager";

export default function PerformanceRoutePage() {
	const navigate = useNavigate();
	const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(true);
	const [initialPreset, setInitialPreset] = useState<Preset | null>(null);

	const { setMidiPorts, selectedMidiPort } = useMidiPort();
	const { selectedMidiChannel } = useMidiChannel();

	const presetId = new URLSearchParams(window.location.search).get("presetId");

	const { data: fetchedPreset } = useQuery({
		queryKey: ["preset", presetId],
		queryFn: () => (presetId ? getPresetById(presetId) : null),
		enabled: Boolean(presetId),
	});

	useEffect(() => {
		if (fetchedPreset) {
			setInitialPreset(fetchedPreset);
		}
	}, [fetchedPreset]);

	useMidiSetup(setMidiPorts);

	const presetMode = usePresetMode({
		selectedMidiPort,
		selectedMidiChannel,
		setCurrentPreset: setInitialPreset,
		setAppMode: (mode: AppMode) => {
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
		},
	});

	const handleNavigate = (mode: AppMode) => {
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
					performanceMode={true}
					setPerformanceMode={() => (window.location.href = "/presets")}
					appMode="presets"
					onNavigate={handleNavigate}
				/>

				<PerformanceMode
					currentPreset={initialPreset}
					handleSelectPreset={presetMode.handleSelectPreset}
				/>
			</div>
		</main>
	);
}
