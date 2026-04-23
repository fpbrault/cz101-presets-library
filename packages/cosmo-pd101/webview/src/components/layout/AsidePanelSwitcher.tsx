import {
	Children,
	isValidElement,
	type ReactElement,
	type ReactNode,
} from "react";
import CzTabButton, {
	type CzTabButtonColor,
	type CzTabButtonLedColor,
} from "@/components/primitives/CzTabButton";
import { useSynthParam } from "@/features/synth/SynthParamController";

export type AsidePanelButtonTab<T extends string> = {
	id: T;
	topLabel: string;
	bottomLabel: string;
};

export type AsidePanelTab =
	| "scope"
	| "global"
	| "phaseMod"
	| "vibrato"
	| "portamento"
	| "lfo"
	| "filter"
	| "chorus"
	| "delay"
	| "reverb";

const FX_TAB_IDS = new Set(["filter", "chorus", "delay", "reverb"]);

export type AsidePanelTabMeta = {
	topLabel: string;
	bottomLabel: string;
};

export type AsidePanelComponent<T extends string = string> = {
	(props: object): ReactElement;
	panelId: T;
	panelTab: AsidePanelTabMeta;
};

type AsidePanelSwitcherProps<T extends string> = {
	activeTab: T;
	onTabChange: (tab: T) => void;
	children: ReactNode;
};

export default function AsidePanelSwitcher<T extends string>({
	activeTab,
	onTabChange,
	children,
}: AsidePanelSwitcherProps<T>) {
	const { value: phaseModEnabled } = useSynthParam("phaseModEnabled");
	const { value: vibratoEnabled } = useSynthParam("vibratoEnabled");
	const { value: portamentoEnabled } = useSynthParam("portamentoEnabled");
	const { value: lfoEnabled } = useSynthParam("lfoEnabled");
	const { value: filterEnabled } = useSynthParam("filterEnabled");
	const { value: chorusEnabled } = useSynthParam("chorusEnabled");
	const { value: delayEnabled } = useSynthParam("delayEnabled");
	const { value: reverbEnabled } = useSynthParam("reverbEnabled");
	const { setValue: setFilterEnabled } = useSynthParam("filterEnabled");
	const { setValue: setChorusEnabled } = useSynthParam("chorusEnabled");
	const { setValue: setDelayEnabled } = useSynthParam("delayEnabled");
	const { setValue: setReverbEnabled } = useSynthParam("reverbEnabled");

	const isTabEnabled = (tabId: T): boolean => {
		switch (String(tabId).toLowerCase()) {
			case "phasemod":
				return phaseModEnabled;
			case "vibrato":
				return vibratoEnabled;
			case "portamento":
				return portamentoEnabled;
			case "lfo":
				return lfoEnabled;
			case "filter":
				return filterEnabled;
			case "chorus":
				return chorusEnabled;
			case "delay":
				return delayEnabled;
			case "reverb":
				return reverbEnabled;
			default:
				return false;
		}
	};

	const getTabColor = (tabId: T): CzTabButtonColor => {
		const normalizedTabId = String(tabId).toLowerCase();

		if (
			normalizedTabId === "phasemod" ||
			normalizedTabId === "vibrato" ||
			normalizedTabId === "lfo"
		) {
			return "red";
		}

		if (
			normalizedTabId === "chorus" ||
			normalizedTabId === "delay" ||
			normalizedTabId === "reverb"
		) {
			return "blue";
		}
		if (normalizedTabId === "scope") {
			return "cyan";
		}

		return "black";
	};

	const isFxTab = (tabId: T): boolean => FX_TAB_IDS.has(String(tabId).toLowerCase());

	const toggleFxTab = (tabId: T) => {
		switch (String(tabId).toLowerCase()) {
			case "filter":
				setFilterEnabled(!filterEnabled);
				break;
			case "chorus":
				setChorusEnabled(!chorusEnabled);
				break;
			case "delay":
				setDelayEnabled(!delayEnabled);
				break;
			case "reverb":
				setReverbEnabled(!reverbEnabled);
				break;
		}
	};

	const handleTabClick = (tabId: T) => {
		if (isFxTab(tabId)) {
			toggleFxTab(tabId);
			return;
		}

		onTabChange(tabId);
	};

	const getTabLedColor = (tabId: T, isActive: boolean): CzTabButtonLedColor => {
		const isEnabled = isTabEnabled(tabId);
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

	const panelElements = Children.toArray(children).filter(
		(child): child is ReactElement => isValidElement(child),
	);

	const activePanel = panelElements.find(
		(child) =>
			(child.type as AsidePanelComponent).panelId === String(activeTab) &&
			!FX_TAB_IDS.has(String(activeTab).toLowerCase()),
	);

	const visibleTabs = panelElements.map((child) => {
		const panelType = child.type as AsidePanelComponent<T>;
		return {
			id: panelType.panelId,
			topLabel: panelType.panelTab.topLabel,
			bottomLabel: panelType.panelTab.bottomLabel,
		};
	});

	return (
		<div className="px-2 pb-2 space-y-2">
			<div className="grid grid-cols-5 gap-1 gap-y-2 mt-2">
				{visibleTabs.map((tab) => (
					<CzTabButton
						key={tab.id}
						color={getTabColor(tab.id)}
						active={isFxTab(tab.id) ? isTabEnabled(tab.id) : activeTab === tab.id}
						ledColor={getTabLedColor(tab.id, activeTab === tab.id)}
						onClick={() => handleTabClick(tab.id)}
						topLabel={tab.topLabel}
						bottomLabel={tab.bottomLabel}
						buttonClassName="aspect-square h-auto"
					/>
				))}
			</div>
			{activePanel}
		</div>
	);
}
