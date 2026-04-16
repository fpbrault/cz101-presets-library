import type { ReactNode } from "react";
import { useEffect, useLayoutEffect, useRef } from "react";
import { useSidebarContext } from "@/context/SidebarContext";

/**
 * Registers content to be displayed in the navigation sidebar's page-specific
 * slot. Call this hook from any mode or page component to contribute content
 * to the shared sidebar. The content is cleared automatically when the calling
 * component unmounts.
 *
 * @example
 * useSidebarContent(<MyPageSidebarContent />);
 */
export function useSidebarContent(content: ReactNode) {
	const { setSidebarContent } = useSidebarContext();

	// Keep a ref so the layout effect always reads the latest content without
	// needing it as a dependency (avoids re-running when JSX identity changes).
	const contentRef = useRef(content);
	contentRef.current = content;

	// Push the latest content into the sidebar after every render.
	// Using useLayoutEffect so the sidebar updates before the browser paints,
	// preventing a flash of empty content on mode switches.
	//
	// No dependency array is intentional: we want to sync content after every
	// render of the calling component. This is safe because setSidebarContent
	// uses a pub-sub pattern — it only triggers AppSidebar to re-render, NOT
	// the calling component, so there is no infinite-render loop.
	useLayoutEffect(() => {
		setSidebarContent(contentRef.current);
	});

	// Clear the sidebar slot when this component unmounts.
	useEffect(() => {
		return () => setSidebarContent(null);
	}, [setSidebarContent]);
}
