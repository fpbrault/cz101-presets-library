import { DelaySection } from "@/components/DelaySection";
import CollapsibleCard from "@/components/ui/CollapsibleCard";

type DelayPanelProps = {
	accordionName: string;
	defaultOpen?: boolean;
	time: number;
	setTime: (v: number) => void;
	feedback: number;
	setFeedback: (v: number) => void;
	mix: number;
	setMix: (v: number) => void;
};

export default function DelayPanel({
	accordionName,
	defaultOpen,
	time,
	setTime,
	feedback,
	setFeedback,
	mix,
	setMix,
}: DelayPanelProps) {
	return (
		<CollapsibleCard
			mode="radio"
			name={accordionName}
			variant="panel-slanted"
			defaultopen={defaultOpen}
			titleClassName="pr-3"
			title="Delay"
		>
			<DelaySection
				time={time}
				setTime={setTime}
				feedback={feedback}
				setFeedback={setFeedback}
				mix={mix}
				setMix={setMix}
			/>
		</CollapsibleCard>
	);
}
