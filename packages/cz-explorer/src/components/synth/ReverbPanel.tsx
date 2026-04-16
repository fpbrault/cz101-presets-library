import { ReverbSection } from "@/components/ReverbSection";
import SynthPanelContainer from "./SynthPanelContainer";

type ReverbPanelProps = {
	enabled: boolean;
	setEnabled: (v: boolean) => void;
	size: number;
	setSize: (v: number) => void;
	mix: number;
	setMix: (v: number) => void;
};

export default function ReverbPanel({
	enabled,
	setEnabled,
	size,
	setSize,
	mix,
	setMix,
}: ReverbPanelProps) {
	return (
		<SynthPanelContainer
			showEnableToggle
			enabled={enabled}
			onToggleEnabled={setEnabled}
		>
			<ReverbSection size={size} setSize={setSize} mix={mix} setMix={setMix} />
		</SynthPanelContainer>
	);
}
