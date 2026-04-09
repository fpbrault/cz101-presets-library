import { createContext, type ReactNode, useContext, useState } from "react";
import { getItem, STORAGE_KEYS, setItem } from "@/lib/storage";

interface MidiPortContextType {
	midiPorts: string[];
	setMidiPorts: (ports: string[]) => void;
	selectedMidiPort: string;
	setSelectedMidiPort: (port: string) => void;
}

const MidiPortContext = createContext<MidiPortContextType | undefined>(
	undefined,
);

export const MidiPortProvider = ({ children }: { children: ReactNode }) => {
	const [midiPorts, setMidiPorts] = useState<string[]>([]);
	const [selectedMidiPort, setSelectedMidiPort] = useState<string>(
		getItem(STORAGE_KEYS.SELECTED_MIDI_PORT, ""),
	);

	const handleSetSelectedMidiPort = (port: string) => {
		setItem(STORAGE_KEYS.SELECTED_MIDI_PORT, port);
		setSelectedMidiPort(port);
	};

	return (
		<MidiPortContext.Provider
			value={{
				midiPorts,
				setMidiPorts,
				selectedMidiPort,
				setSelectedMidiPort: handleSetSelectedMidiPort,
			}}
		>
			{children}
		</MidiPortContext.Provider>
	);
};

export const useMidiPort = () => {
	const context = useContext(MidiPortContext);
	if (!context) {
		throw new Error("useMidiPort must be used within a MidiPortProvider");
	}
	return context;
};
