import { createContext, type ReactNode, useContext, useState } from "react";
import { getItem, STORAGE_KEYS, setItem } from "@/lib/storage";

interface MidiChannelContextType {
	selectedMidiChannel: number;
	setSelectedMidiChannel: (channel: number) => void;
}

const MidiChannelContext = createContext<MidiChannelContextType | undefined>(
	undefined,
);

export const MidiChannelProvider = ({ children }: { children: ReactNode }) => {
	const [selectedMidiChannel, setSelectedMidiChannel] = useState<number>(
		getItem(STORAGE_KEYS.SELECTED_MIDI_CHANNEL, 1),
	);

	const handleSetSelectedMidiChannel = (channel: number) => {
		setItem(STORAGE_KEYS.SELECTED_MIDI_CHANNEL, channel);
		setSelectedMidiChannel(channel);
	};

	return (
		<MidiChannelContext.Provider
			value={{
				selectedMidiChannel,
				setSelectedMidiChannel: handleSetSelectedMidiChannel,
			}}
		>
			{children}
		</MidiChannelContext.Provider>
	);
};

export const useMidiChannel = () => {
	const context = useContext(MidiChannelContext);
	if (!context) {
		throw new Error("useMidiChannel must be used within a MidiChannelProvider");
	}
	return context;
};
