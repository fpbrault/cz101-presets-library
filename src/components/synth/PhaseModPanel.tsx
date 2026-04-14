import ControlKnob from "@/components/ControlKnob";
import CollapsibleCard from "@/components/ui/CollapsibleCard";
import CzButton from "@/components/ui/CzButton";

type PhaseModPanelProps = {
	accordionName: string;
	defaultOpen?: boolean;
	intPmAmount: number;
	setIntPmAmount: (v: number) => void;
	intPmRatio: number;
	setIntPmRatio: (v: number) => void;
	pmPre: boolean;
	setPmPre: (v: boolean) => void;
};

export default function PhaseModPanel({
	accordionName,
	defaultOpen,
	intPmAmount,
	setIntPmAmount,
	intPmRatio,
	setIntPmRatio,
	pmPre,
	setPmPre,
}: PhaseModPanelProps) {
	return (
		<CollapsibleCard
			mode="radio"
			name={accordionName}
			variant="panel-slanted"
			defaultopen={defaultOpen}
			titleClassName="pr-3"
			title="Phase Mod"
		>
			<div className="flex justify-center gap-4">
				<ControlKnob
					value={intPmAmount}
					onChange={setIntPmAmount}
					min={0}
					max={0.3}
					size={52}
					color="#7f9de4"
					label="Amount"
					valueFormatter={(value) => value.toFixed(2)}
				/>
				<ControlKnob
					value={intPmRatio}
					onChange={setIntPmRatio}
					min={0.5}
					max={4}
					size={52}
					color="#9cb937"
					label="Ratio"
					valueFormatter={(value) => value.toFixed(1)}
				/>
			</div>
			<CzButton
				active={pmPre}
				onClick={() => setPmPre(!pmPre)}
				className="mt-3 [&_button]:bg-cz-inset [&_button]:border-cz-border"
			>
				Pre-warp PM
			</CzButton>
		</CollapsibleCard>
	);
}
