import { DelaySection } from "@/components/DelaySection";
import SynthPanelContainer from "./SynthPanelContainer";

type DelayPanelProps = {
	enabled: boolean;
	setEnabled: (v: boolean) => void;
	time: number;
	setTime: (v: number) => void;
	feedback: number;
	setFeedback: (v: number) => void;
	mix: number;
	setMix: (v: number) => void;
};

export default function DelayPanel({
	enabled,
	setEnabled,
	time,
	setTime,
	feedback,
	setFeedback,
	mix,
	setMix,
}: DelayPanelProps) {
	return (
		<SynthPanelContainer
			showEnableToggle
			enabled={enabled}
			onToggleEnabled={setEnabled}
		>
			<DelaySection
				time={time}
				setTime={setTime}
				feedback={feedback}
				setFeedback={setFeedback}
				mix={mix}
				setMix={setMix}
			/>
		</SynthPanelContainer>
	);
}
