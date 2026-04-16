import { ReverbSection } from "@/components/ReverbSection";
import CollapsibleCard from "@/components/ui/CollapsibleCard";

type ReverbPanelProps = {
	accordionName: string;
	defaultOpen?: boolean;
	size: number;
	setSize: (v: number) => void;
	mix: number;
	setMix: (v: number) => void;
};

export default function ReverbPanel({
	accordionName,
	defaultOpen,
	size,
	setSize,
	mix,
	setMix,
}: ReverbPanelProps) {
	return (
		<CollapsibleCard
			mode="radio"
			name={accordionName}
			variant="panel-gold"
			defaultopen={defaultOpen}
			titleClassName="pr-3"
			title="Reverb"
		>
			<ReverbSection size={size} setSize={setSize} mix={mix} setMix={setMix} />
		</CollapsibleCard>
	);
}
