import ControlKnob from "@/components/ControlKnob";
import CollapsibleCard from "@/components/ui/CollapsibleCard";
import CzButton from "@/components/ui/CzButton";

type PortamentoPanelProps = {
	accordionName: string;
	defaultOpen?: boolean;
	portamentoEnabled: boolean;
	setPortamentoEnabled: (v: boolean) => void;
	portamentoMode: "rate" | "time";
	setPortamentoMode: (v: "rate" | "time") => void;
	portamentoRate: number;
	setPortamentoRate: (v: number) => void;
	portamentoTime: number;
	setPortamentoTime: (v: number) => void;
};

export default function PortamentoPanel({
	accordionName,
	defaultOpen,
	portamentoEnabled,
	setPortamentoEnabled,
	portamentoMode,
	setPortamentoMode,
	portamentoRate,
	setPortamentoRate,
	portamentoTime,
	setPortamentoTime,
}: PortamentoPanelProps) {
	return (
		<CollapsibleCard
			mode="radio"
			name={accordionName}
			variant="panel-slanted"
			defaultopen={defaultOpen}
			titleClassName="pr-3"
			title="Portamento"
		>
			<CzButton
				active={portamentoEnabled}
				onClick={() => setPortamentoEnabled(!portamentoEnabled)}
				className="mb-2 [&_button]:bg-cz-inset [&_button]:border-cz-border"
			>
				Enable Portamento
			</CzButton>
			<div className="flex w-full gap-1 mb-2">
				<CzButton
					active={portamentoMode === "rate"}
					onClick={() => setPortamentoMode("rate")}
					className="flex-1"
				>
					Rate
				</CzButton>
				<CzButton
					active={portamentoMode === "time"}
					onClick={() => setPortamentoMode("time")}
					className="flex-1"
				>
					Time
				</CzButton>
			</div>
			<div className="flex justify-center gap-2">
				{portamentoMode === "rate" ? (
					<ControlKnob
						value={portamentoRate}
						onChange={setPortamentoRate}
						min={0}
						max={99}
						size={52}
						color="#7f9de4"
						label="Rate"
						valueFormatter={(v) => `${Math.round(v)}`}
					/>
				) : (
					<ControlKnob
						value={portamentoTime}
						onChange={setPortamentoTime}
						min={0}
						max={2}
						size={52}
						color="#7f9de4"
						label="Time"
						valueFormatter={(v) => `${v.toFixed(2)}s`}
					/>
				)}
			</div>
		</CollapsibleCard>
	);
}
