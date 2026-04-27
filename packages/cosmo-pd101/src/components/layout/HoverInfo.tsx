import {
	createContext,
	type HTMLAttributes,
	type PropsWithChildren,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
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
	const localReadoutTimeoutRef = useRef<number | null>(null);

	const setHoverInfo = useCallback((message: string | null | undefined) => {
		setHoverInfoState(message?.trim() ? message : null);
	}, []);

	const clearHoverInfo = useCallback(() => {
		setHoverInfoState(null);
	}, []);

	const setControlReadout = useCallback(
		(readout: InfoReadout | null | undefined) => {
			if (localReadoutTimeoutRef.current != null) {
				window.clearTimeout(localReadoutTimeoutRef.current);
				localReadoutTimeoutRef.current = null;
			}

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
			localReadoutTimeoutRef.current = window.setTimeout(() => {
				setLocalReadout(null);
			}, 1200);
		},
		[],
	);

	const clearControlReadout = useCallback(() => {
		if (localReadoutTimeoutRef.current != null) {
			window.clearTimeout(localReadoutTimeoutRef.current);
			localReadoutTimeoutRef.current = null;
		}
		setLocalReadout(null);
	}, []);

	useEffect(() => {
		return () => {
			if (localReadoutTimeoutRef.current != null) {
				window.clearTimeout(localReadoutTimeoutRef.current);
			}
		};
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

type HoverInfoHandlersOptions = {
	useCapture?: boolean;
};

type HoverInfoHandlers = Pick<
	HTMLAttributes<HTMLElement>,
	| "onPointerEnter"
	| "onPointerLeave"
	| "onFocus"
	| "onBlur"
	| "onFocusCapture"
	| "onBlurCapture"
>;

export function useHoverInfoHandlers(
	message: string | null | undefined,
	{ useCapture = false }: HoverInfoHandlersOptions = {},
): HoverInfoHandlers {
	const { setHoverInfo, clearHoverInfo } = useHoverInfo();

	return useMemo(() => {
		if (!message?.trim()) {
			return {};
		}

		if (useCapture) {
			return {
				onPointerEnter: () => setHoverInfo(message),
				onPointerLeave: clearHoverInfo,
				onFocusCapture: () => setHoverInfo(message),
				onBlurCapture: clearHoverInfo,
			};
		}

		return {
			onPointerEnter: () => setHoverInfo(message),
			onPointerLeave: clearHoverInfo,
			onFocus: () => setHoverInfo(message),
			onBlur: clearHoverInfo,
		};
	}, [clearHoverInfo, message, setHoverInfo, useCapture]);
}

export function HoverInfoTrigger({
	message,
	children,
	useCapture,
}: {
	message: string;
	children: (handlers: HoverInfoHandlers) => ReactNode;
	useCapture?: boolean;
}) {
	const handlers = useHoverInfoHandlers(message, { useCapture });
	return <>{children(handlers)}</>;
}
