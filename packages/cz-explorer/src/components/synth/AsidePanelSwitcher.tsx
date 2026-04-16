import type { ReactNode } from "react";
import CzTabButton, {
	type CzTabButtonColor,
	type CzTabButtonLedColor,
} from "@/components/ui/CzTabButton";

export type AsidePanelButtonTab<T extends string> = {
	id: T;
	topLabel: string;
	bottomLabel: string;
};

type AsidePanelSwitcherProps<T extends string> = {
	tabs: AsidePanelButtonTab<T>[];
	activeTab: T;
	onTabChange: (tab: T) => void;
	panels: Record<T, ReactNode>;
	tabEnabledState?: Partial<Record<T, boolean>>;
};

export default function AsidePanelSwitcher<T extends string>({
	tabs,
	activeTab,
	onTabChange,
	panels,
	tabEnabledState,
}: AsidePanelSwitcherProps<T>) {
	const getTabColor = (tabId: T): CzTabButtonColor => {
		const normalizedTabId = String(tabId).toLowerCase();

		if (normalizedTabId === "phasemod" || normalizedTabId === "vibrato" || normalizedTabId === "lfo") {
			return "red";
		}

		if (
			normalizedTabId === "chorus" ||
			normalizedTabId === "delay" ||
			normalizedTabId === "reverb"
		) {
			return "blue";
		}
		if (
			normalizedTabId === "scope" 
		) {
			return "cyan";
		}

		return "black";
	};

	const getTabLedColor = (tabId: T, isActive: boolean): CzTabButtonLedColor => {
		const isEnabled = tabEnabledState?.[tabId] === true;
		if (isEnabled && isActive) {
			return "blue";
		}

		if (isEnabled) {
			return "green";
		}

		if (isActive) {
			return "red";
		}

		return "off";
	};

	return (
		<div className="px-2 pb-2 space-y-2">
			<div className="grid grid-cols-5 gap-1 gap-y-2 mt-2">
				{tabs.map((tab) => (
					<CzTabButton
						key={tab.id}
						color={getTabColor(tab.id)}
						active={activeTab === tab.id}
						ledColor={getTabLedColor(tab.id, activeTab === tab.id)}
						onClick={() => onTabChange(tab.id)}
						topLabel={tab.topLabel}
						bottomLabel={tab.bottomLabel}
						buttonClassName="aspect-square h-auto"
					/>
				))}
			</div>
			{panels[activeTab]}
		</div>
	);
}
