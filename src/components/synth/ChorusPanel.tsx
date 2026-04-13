import { ChorusSection } from "@/components/ChorusSection";
import CollapsibleCard from "@/components/ui/CollapsibleCard";

type ChorusPanelProps = {
	accordionName: string;
	defaultOpen?: boolean;
	rate: number;
	setRate: (v: number) => void;
	depth: number;
	setDepth: (v: number) => void;
	mix: number;
	setMix: (v: number) => void;
};

export default function ChorusPanel({
	accordionName,
	defaultOpen,
	rate,
	setRate,
	depth,
	setDepth,
	mix,
	setMix,
}: ChorusPanelProps) {
	return (
		<CollapsibleCard
			mode="radio"
			name={accordionName}
			variant="panel-slanted"
			defaultOpen={defaultOpen}
			titleClassName="pr-3"
			title="Chorus"
		>
			<ChorusSection
				rate={rate}
				setRate={setRate}
				depth={depth}
				setDepth={setDepth}
				mix={mix}
				setMix={setMix}
			/>
		</CollapsibleCard>
	);
}
