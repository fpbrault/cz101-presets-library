import {
	createContext,
	type PropsWithChildren,
	useCallback,
	useContext,
	useMemo,
	useState,
} from "react";

type HoverInfoContextValue = {
	hoverInfo: string | null;
	setHoverInfo: (message: string | null | undefined) => void;
	clearHoverInfo: () => void;
};

const HoverInfoContext = createContext<HoverInfoContextValue | null>(null);

export function HoverInfoProvider({ children }: PropsWithChildren) {
	const [hoverInfo, setHoverInfoState] = useState<string | null>(null);

	const setHoverInfo = useCallback((message: string | null | undefined) => {
		setHoverInfoState(message?.trim() ? message : null);
	}, []);

	const clearHoverInfo = useCallback(() => {
		setHoverInfoState(null);
	}, []);

	const value = useMemo(
		() => ({ hoverInfo, setHoverInfo, clearHoverInfo }),
		[hoverInfo, setHoverInfo, clearHoverInfo],
	);

	return (
		<HoverInfoContext.Provider value={value}>{children}</HoverInfoContext.Provider>
	);
}

export function useHoverInfo() {
	const context = useContext(HoverInfoContext);

	if (!context) {
		return {
			hoverInfo: null,
			setHoverInfo: (_message: string | null | undefined) => {},
			clearHoverInfo: () => {},
		};
	}

	return context;
}