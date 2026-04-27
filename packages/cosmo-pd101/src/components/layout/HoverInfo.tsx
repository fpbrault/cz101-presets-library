import {
	createContext,
	type PropsWithChildren,
	useCallback,
	useContext,
	useMemo,
	useState,
} from "react";

type InfoReadout = {
	label: string;
	value: string;
};

type HoverInfoContextValue = {
	hoverInfo: string | null;
	infoText: string;
	setHoverInfo: (message: string | null | undefined) => void;
	clearHoverInfo: () => void;
	setControlReadout: (readout: InfoReadout | null | undefined) => void;
	clearControlReadout: () => void;
};

const HoverInfoContext = createContext<HoverInfoContextValue | null>(null);

type HoverInfoProviderProps = PropsWithChildren<{
	defaultInfoText?: string;
	externalReadout?: InfoReadout | null;
}>;

function formatInfoText(
	hoverInfo: string | null,
	readout: InfoReadout | null,
	defaultInfoText: string,
): string {
	if (hoverInfo && readout) {
		return `${hoverInfo} | ${readout.label}: ${readout.value}`;
	}

	if (hoverInfo) {
		return hoverInfo;
	}

	if (readout) {
		return `${readout.label}: ${readout.value}`;
	}

	return defaultInfoText;
}

export function HoverInfoProvider({
	children,
	defaultInfoText = "Hover any control for context.",
	externalReadout = null,
}: HoverInfoProviderProps) {
	const [hoverInfo, setHoverInfoState] = useState<string | null>(null);
	const [localReadout, setLocalReadout] = useState<InfoReadout | null>(null);

	const setHoverInfo = useCallback((message: string | null | undefined) => {
		setHoverInfoState(message?.trim() ? message : null);
	}, []);

	const clearHoverInfo = useCallback(() => {
		setHoverInfoState(null);
	}, []);

	const setControlReadout = useCallback(
		(readout: InfoReadout | null | undefined) => {
			if (!readout) {
				setLocalReadout(null);
				return;
			}

			if (!readout.label.trim() || !readout.value.trim()) {
				setLocalReadout(null);
				return;
			}

			setLocalReadout({
				label: readout.label,
				value: readout.value,
			});
		},
		[],
	);

	const clearControlReadout = useCallback(() => {
		setLocalReadout(null);
	}, []);

	const resolvedReadout = localReadout ?? externalReadout;
	const infoText = formatInfoText(hoverInfo, resolvedReadout, defaultInfoText);

	const value = useMemo(
		() => ({
			hoverInfo,
			infoText,
			setHoverInfo,
			clearHoverInfo,
			setControlReadout,
			clearControlReadout,
		}),
		[
			hoverInfo,
			infoText,
			setHoverInfo,
			clearHoverInfo,
			setControlReadout,
			clearControlReadout,
		],
	);

	return (
		<HoverInfoContext.Provider value={value}>
			{children}
		</HoverInfoContext.Provider>
	);
}

export function useHoverInfo() {
	const context = useContext(HoverInfoContext);

	if (!context) {
		return {
			hoverInfo: null,
			infoText: "Hover any control for context.",
			setHoverInfo: (_message: string | null | undefined) => {},
			clearHoverInfo: () => {},
			setControlReadout: (_readout: InfoReadout | null | undefined) => {},
			clearControlReadout: () => {},
		};
	}

	return context;
}
