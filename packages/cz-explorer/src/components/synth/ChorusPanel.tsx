import { ChorusSection } from "@/components/ChorusSection";
import SynthPanelContainer from "./SynthPanelContainer";

type ChorusPanelProps = {
	enabled: boolean;
	setEnabled: (v: boolean) => void;
	rate: number;
	setRate: (v: number) => void;
	depth: number;
	setDepth: (v: number) => void;
	mix: number;
	setMix: (v: number) => void;
};

export default function ChorusPanel({
	enabled,
	setEnabled,
	rate,
	setRate,
	depth,
	setDepth,
	mix,
	setMix,
}: ChorusPanelProps) {
	return (
		<SynthPanelContainer
			showEnableToggle
			enabled={enabled}
			onToggleEnabled={setEnabled}
		>
			<ChorusSection
				rate={rate}
				setRate={setRate}
				depth={depth}
				setDepth={setDepth}
				mix={mix}
				setMix={setMix}
			/>
		</SynthPanelContainer>
	);
}
