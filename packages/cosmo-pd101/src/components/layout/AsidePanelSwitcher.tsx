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
	| "chorus"
	| "delay"
	| "reverb";

const TOGGLE_TAB_IDS = new Set([
	"polymode",
	"portamentoenabled",
	"phasemod",
	"vibrato",
	"chorus",
	"delay",
	"reverb",
]);

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
	const { value: polyMode, setValue: setPolyMode } = useSynthParam("polyMode");
	const { value: portamentoEnabled, setValue: setPortamentoEnabled } =
		useSynthParam("portamentoEnabled");
	const { value: phaseModEnabled } = useSynthParam("phaseModEnabled");
	const { value: vibratoEnabled } = useSynthParam("vibratoEnabled");
	const { value: chorusEnabled } = useSynthParam("chorusEnabled");
	const { value: delayEnabled } = useSynthParam("delayEnabled");
	const { value: reverbEnabled } = useSynthParam("reverbEnabled");
	const { setValue: setPhaseModEnabled } = useSynthParam("phaseModEnabled");
	const { setValue: setVibratoEnabled } = useSynthParam("vibratoEnabled");
	const { setValue: setChorusEnabled } = useSynthParam("chorusEnabled");
	const { setValue: setDelayEnabled } = useSynthParam("delayEnabled");
	const { setValue: setReverbEnabled } = useSynthParam("reverbEnabled");

	const isTabEnabled = (tabId: T): boolean => {
		switch (String(tabId).toLowerCase()) {
			case "polymode":
				return polyMode === "mono";
			case "portamentoenabled":
				return portamentoEnabled;
			case "phasemod":
				return phaseModEnabled;
			case "vibrato":
				return vibratoEnabled;
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

		if (normalizedTabId === "phasemod" || normalizedTabId === "vibrato") {
			return "red";
		}

		if (
			normalizedTabId === "chorus" ||
			normalizedTabId === "delay" ||
			normalizedTabId === "reverb"
		) {
			return "blue";
		}
		if (normalizedTabId === "scope" || normalizedTabId === "global") {
			return "cyan";
		}

		return "black";
	};

	const isToggleTab = (tabId: T): boolean =>
		TOGGLE_TAB_IDS.has(String(tabId).toLowerCase());

	const toggleTab = (tabId: T) => {
		switch (String(tabId).toLowerCase()) {
			case "polymode":
				setPolyMode(polyMode === "poly8" ? "mono" : "poly8");
				break;
			case "portamentoenabled":
				setPortamentoEnabled(!portamentoEnabled);
				break;
			case "phasemod":
				setPhaseModEnabled(!phaseModEnabled);
				break;
			case "vibrato":
				setVibratoEnabled(!vibratoEnabled);
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
		if (isToggleTab(tabId)) {
			toggleTab(tabId);
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
			!TOGGLE_TAB_IDS.has(String(activeTab).toLowerCase()),
	);

	const visibleTabs = panelElements.map((child) => {
		const panelType = child.type as AsidePanelComponent<T>;
		return {
			id: panelType.panelId,
			topLabel: panelType.panelTab.topLabel,
			bottomLabel: panelType.panelTab.bottomLabel,
		};
	});

	const utilityToggleTabs = [
		{
			id: "polyMode" as T,
			topLabel: polyMode === "poly8" ? "Poly8" : "Mono",
			bottomLabel: "",
		},
		{
			id: "portamentoEnabled" as T,
			topLabel: "Porta",
			bottomLabel: "Mento",
		},
	];

	const globalTab = visibleTabs.find(
		(tab) => String(tab.id).toLowerCase() === "global",
	);
	const nonGlobalTabs = visibleTabs.filter(
		(tab) => String(tab.id).toLowerCase() !== "global",
	);
	const allTabs = [
		...(globalTab ? [globalTab] : []),
		...utilityToggleTabs,
		...nonGlobalTabs,
	];

	return (
		<div className="px-2 pb-2 space-y-2">
			<div className="grid grid-cols-5 gap-1 gap-y-2 mt-2">
				{allTabs.map((tab) => (
					<CzTabButton
						key={tab.id}
						color={getTabColor(tab.id)}
						active={
							isToggleTab(tab.id) ? isTabEnabled(tab.id) : activeTab === tab.id
						}
						ledColor={getTabLedColor(tab.id, activeTab === tab.id)}
						onClick={() => handleTabClick(tab.id)}
						topLabel={tab.topLabel}
						bottomLabel={tab.bottomLabel}
					/>
				))}
			</div>
			{activePanel}
		</div>
	);
}
