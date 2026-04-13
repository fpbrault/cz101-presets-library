import ControlKnob from "@/components/ControlKnob";
import CollapsibleCard from "@/components/ui/CollapsibleCard";
import CzButton from "@/components/ui/CzButton";

type PolyMode = "poly8" | "mono";
type VelocityTarget = "amp" | "dcw" | "both" | "off";

type GlobalVoicePanelProps = {
	accordionName: string;
	defaultOpen?: boolean;
	volume: number;
	setVolume: (v: number) => void;
	polyMode: PolyMode;
	setPolyMode: (v: PolyMode) => void;
	legato: boolean;
	setLegato: (v: boolean) => void;
	sustainOn: boolean;
	onSustainToggle: () => void;
	velocityTarget: VelocityTarget;
	setVelocityTarget: (v: VelocityTarget) => void;
	windowType: "off" | "saw" | "triangle";
	setWindowType: (v: "off" | "saw" | "triangle") => void;
};

export default function GlobalVoicePanel({
	accordionName,
	defaultOpen,
	volume,
	setVolume,
	polyMode,
	setPolyMode,
	legato,
	setLegato,
	sustainOn,
	onSustainToggle,
	velocityTarget,
	setVelocityTarget,
	windowType,
	setWindowType,
}: GlobalVoicePanelProps) {
	return (
		<CollapsibleCard
			mode="radio"
			name={accordionName}
			variant="panel-slanted"
			defaultOpen={defaultOpen}
			titleClassName="pr-3"
			title="Global Voice"
		>
			<div className="mb-3 flex justify-center">
				<ControlKnob
					value={volume}
					onChange={setVolume}
					min={0}
					max={1}
					size={58}
					color="#9cb937"
					label="Volume"
					valueFormatter={(value) => `${Math.round(value * 100)}%`}
				/>
			</div>
			<div className="space-y-2">
				<div className="flex w-full gap-1">
					<CzButton
						active={polyMode === "poly8"}
						onClick={() => setPolyMode("poly8")}
						className="flex-1"
					>
						Poly 8
					</CzButton>
					<CzButton
						active={polyMode === "mono"}
						onClick={() => setPolyMode("mono")}
						className="flex-1"
					>
						Mono
					</CzButton>
				</div>
				{polyMode === "mono" && (
					<CzButton
						active={legato}
						onClick={() => setLegato(!legato)}
						className="[&_button]:bg-cz-inset [&_button]:border-cz-border"
					>
						Legato
					</CzButton>
				)}
				<div className="flex items-center gap-2">
					<CzButton active={sustainOn} onClick={onSustainToggle}>
						Sustain
					</CzButton>
					<span className="text-xs text-cz-cream-dim/45">Spacebar</span>
				</div>
				<div>
					<div className="mb-2 cz-section-bar">Velocity</div>
					<div className="flex flex-wrap gap-1">
						{(["amp", "dcw", "both", "off"] as VelocityTarget[]).map(
							(target) => (
								<CzButton
									key={target}
									active={velocityTarget === target}
									onClick={() => setVelocityTarget(target)}
								>
									{target === "amp"
										? "Amp"
										: target === "dcw"
											? "DCW"
											: target === "both"
												? "Both"
												: "Off"}
								</CzButton>
							),
						)}
					</div>
				</div>
				<div>
					<div className="mb-2 cz-section-bar">Window</div>
					<select
						className="select select-sm w-full bg-cz-surface border-cz-border text-cz-cream"
						value={windowType}
						onChange={(e) =>
							setWindowType(e.target.value as "off" | "saw" | "triangle")
						}
					>
						<option value="off">Off</option>
						<option value="saw">Saw</option>
						<option value="triangle">Triangle</option>
					</select>
				</div>
			</div>
		</CollapsibleCard>
	);
}
