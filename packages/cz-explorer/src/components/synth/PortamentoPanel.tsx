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
			variant="panel-gold"
			defaultopen={defaultOpen}
			titleClassName="pr-3"
			title="Portamento"
		>
			<div className="mb-2 flex items-center justify-center gap-2">
				<span className="text-[10px] font-mono text-cz-cream-dim uppercase tracking-wider">
					Enable
				</span>
				<button
					type="button"
					className={`cz-btn-arrow ${portamentoEnabled ? "bg-cz-gold" : ""}`}
					onClick={() => setPortamentoEnabled(!portamentoEnabled)}
				>
					<span
						className={`text-[8px] font-mono font-bold uppercase tracking-wider ${
							portamentoEnabled ? "text-white" : "text-cz-cream-dim"
						}`}
					>
						{portamentoEnabled ? "On" : "Off"}
					</span>
				</button>
			</div>
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
