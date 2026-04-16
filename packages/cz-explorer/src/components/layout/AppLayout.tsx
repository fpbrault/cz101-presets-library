import { type ReactNode, useState } from "react";
import AppSidebar from "@/components/layout/AppSidebar";

interface AppLayoutProps {
	children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
	const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(true);

	return (
		<main className="flex flex-col w-full h-full min-h-0 min-w-0">
			<div className="flex flex-row h-full min-h-0 min-w-0 overflow-hidden">
				<AppSidebar
					leftPanelCollapsed={leftPanelCollapsed}
					setLeftPanelCollapsed={setLeftPanelCollapsed}
				/>
				<div className="flex-1 min-h-0 min-w-0 overflow-hidden">{children}</div>
			</div>
		</main>
	);
}
