import { useQuery } from "@tanstack/react-query";
import { useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import PerformanceMode from "@/components/presets/PerformanceMode";
import { useMidiChannel } from "@/context/MidiChannelContext";
import { useMidiPort } from "@/context/MidiPortContext";
import { usePresetMode } from "@/features/presets/hooks/usePresetMode";
import { useMidiSetup } from "@/hooks/useMidiSetup";
import type { Preset } from "@/lib/presets/presetManager";
import { getPresetById } from "@/lib/presets/presetManager";

export default function PerformanceRoutePage() {
	const location = useLocation();
	const [initialPreset, setInitialPreset] = useState<Preset | null>(null);

	const { setMidiPorts, selectedMidiPort } = useMidiPort();
	const { selectedMidiChannel } = useMidiChannel();

	const presetId = new URLSearchParams(location.search).get("presetId");

	const { data: fetchedPreset } = useQuery({
		queryKey: ["preset", presetId],
		queryFn: () => (presetId ? getPresetById(presetId) : null),
		enabled: Boolean(presetId),
	});

	useEffect(() => {
	      if (!presetId) {  
            setInitialPreset(null);  
            return;  
        }  

        if (fetchedPreset) {  
            setInitialPreset(fetchedPreset);  
            return;  
        }  

        setInitialPreset(null);  
    }, [presetId, fetchedPreset]);  

	useMidiSetup(setMidiPorts);

	const presetMode = usePresetMode({
		selectedMidiPort,
		selectedMidiChannel,
		setCurrentPreset: setInitialPreset,
	});

	return (
		<PerformanceMode
			currentPreset={initialPreset}
			handleSelectPreset={presetMode.handleSelectPreset}
		/>
	);
}
