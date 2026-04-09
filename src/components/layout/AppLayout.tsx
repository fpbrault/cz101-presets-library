import { useState } from "react";
import AppSidebar from "@/components/layout/AppSidebar";

interface AppLayoutProps {
	children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
	const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(true);

	return (
		<main className="flex flex-col w-full h-full">
			<div className="flex flex-row h-full overflow-hidden">
				<AppSidebar
					leftPanelCollapsed={leftPanelCollapsed}
					setLeftPanelCollapsed={setLeftPanelCollapsed}
				/>
				{children}
			</div>
		</main>
	);
}
