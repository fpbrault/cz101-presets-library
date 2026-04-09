import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
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
	const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(true);
	const [initialPreset, setInitialPreset] = useState<Preset | null>(null);
	const [searchParams] = useSearchParams();

	const navigate = useNavigate();
	const { setMidiPorts, selectedMidiPort } = useMidiPort();
	const { selectedMidiChannel } = useMidiChannel();

	const presetId = searchParams.get("presetId");

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
				presets: "presets",
				synthBackups: "synth-backups",
				setlists: "setlists",
				tagManager: "tags",
				duplicateFinder: "duplicates",
			};
			navigate(`/${routeMap[mode]}`);
		},
	});

	const handleNavigate = (mode: AppMode) => {
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
					performanceMode={true}
					setPerformanceMode={() => navigate("/presets")}
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
