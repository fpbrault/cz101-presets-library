import ControlKnob from "@/components/ControlKnob";
import CollapsibleCard from "@/components/ui/CollapsibleCard";
import CzButton from "@/components/ui/CzButton";

type VibratoPanelProps = {
	accordionName: string;
	defaultOpen?: boolean;
	vibratoEnabled: boolean;
	setVibratoEnabled: (v: boolean) => void;
	vibratoWave: number;
	setVibratoWave: (v: number) => void;
	vibratoRate: number;
	setVibratoRate: (v: number) => void;
	vibratoDepth: number;
	setVibratoDepth: (v: number) => void;
	vibratoDelay: number;
	setVibratoDelay: (v: number) => void;
};

export default function VibratoPanel({
	accordionName,
	defaultOpen,
	vibratoEnabled,
	setVibratoEnabled,
	vibratoWave,
	setVibratoWave,
	vibratoRate,
	setVibratoRate,
	vibratoDepth,
	setVibratoDepth,
	vibratoDelay,
	setVibratoDelay,
}: VibratoPanelProps) {
	return (
		<CollapsibleCard
			mode="radio"
			name={accordionName}
			variant="panel-slanted"
			defaultopen={defaultOpen}
			titleClassName="pr-3"
			title={
				<span className="flex items-center gap-2">
					<span>Vibrato</span>
					<CzButton
						active={vibratoEnabled}
						onClick={() => setVibratoEnabled(!vibratoEnabled)}
					>
						{vibratoEnabled ? "On" : "Off"}
					</CzButton>
				</span>
			}
		>
			<div className="flex justify-center gap-2">
				{(["sine", "tri", "sq", "saw"] as const).map((w, i) => (
					<CzButton
						key={w}
						active={vibratoWave === i + 1}
						onClick={() => setVibratoWave(i + 1)}
					>
						{w}
					</CzButton>
				))}
			</div>
			<div className="flex justify-center gap-2 mt-2">
				<ControlKnob
					value={vibratoRate}
					onChange={setVibratoRate}
					min={0}
					max={99}
					size={44}
					color="#7f9de4"
					label="Rate"
					valueFormatter={(v) => `${Math.round(v)}`}
				/>
				<ControlKnob
					value={vibratoDepth}
					onChange={setVibratoDepth}
					min={0}
					max={99}
					size={44}
					color="#7f9de4"
					label="Depth"
					valueFormatter={(v) => `${Math.round(v)}`}
				/>
				<ControlKnob
					value={vibratoDelay}
					onChange={setVibratoDelay}
					min={0}
					max={5000}
					size={44}
					color="#7f9de4"
					label="Delay"
					valueFormatter={(v) => `${Math.round(v)}ms`}
				/>
			</div>
		</CollapsibleCard>
	);
}
