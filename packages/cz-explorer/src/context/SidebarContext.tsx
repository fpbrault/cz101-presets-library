import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useRef,
	useState,
} from "react";

type SidebarListener = (content: ReactNode) => void;

interface SidebarContextValue {
	setSidebarContent: (content: ReactNode) => void;
	subscribe: (listener: SidebarListener) => () => void;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function SidebarProvider({ children }: { children: ReactNode }) {
	const listenersRef = useRef<Set<SidebarListener>>(new Set());

	const setSidebarContent = useCallback((content: ReactNode) => {
		listenersRef.current.forEach((listener) => {
			listener(content);
		});
	}, []);

	const subscribe = useCallback((listener: SidebarListener) => {
		listenersRef.current.add(listener);
		return () => {
			listenersRef.current.delete(listener);
		};
	}, []);

	return (
		<SidebarContext.Provider value={{ setSidebarContent, subscribe }}>
			{children}
		</SidebarContext.Provider>
	);
}

export function useSidebarContext() {
	const ctx = useContext(SidebarContext);
	if (!ctx)
		throw new Error("useSidebarContext must be used within SidebarProvider");
	return ctx;
}

/** Used by AppSidebar to read the currently registered page content. */
export function useSidebarContentSlot(): ReactNode {
	const { subscribe } = useSidebarContext();
	const [content, setContent] = useState<ReactNode>(null);

	useEffect(() => {
		return subscribe(setContent);
	}, [subscribe]);

	return content;
}
