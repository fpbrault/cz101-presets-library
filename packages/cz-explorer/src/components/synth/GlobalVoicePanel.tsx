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
	velocityTarget: VelocityTarget;
	setVelocityTarget: (v: VelocityTarget) => void;
	pitchBendRange: number;
	setPitchBendRange: (v: number) => void;
	modWheelVibratoDepth: number;
	setModWheelVibratoDepth: (v: number) => void;
};

export default function GlobalVoicePanel({
	accordionName,
	defaultOpen,
	volume,
	setVolume,
	polyMode,
	setPolyMode,
	velocityTarget,
	setVelocityTarget,
	pitchBendRange,
	setPitchBendRange,
	modWheelVibratoDepth,
	setModWheelVibratoDepth,
}: GlobalVoicePanelProps) {
	return (
		<CollapsibleCard
			mode="radio"
			name={accordionName}
			variant="panel-slanted"
			defaultopen={defaultOpen}
			titleClassName="pr-3"
			title="Global"
		>
			<div className="mb-3 flex justify-center">
				<ControlKnob
					value={volume}
					onChange={setVolume}
					min={0}
					max={1}
					size={32}
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
				<div>
					<div className="mb-2 cz-light-blue">Velocity</div>
					<div className="flex flex-wrap gap-1 justify-center">
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
				<div className="flex justify-around pt-1">
					<ControlKnob
						value={pitchBendRange}
						onChange={setPitchBendRange}
						min={1}
						max={24}
						size={28}
						color="#5bc8d4"
						label="Bend"
						valueFormatter={(v) => `${Math.round(v)} st`}
					/>
					<ControlKnob
						value={modWheelVibratoDepth}
						onChange={setModWheelVibratoDepth}
						min={0}
						max={99}
						size={28}
						color="#5bc8d4"
						label="Mod→Vib"
						valueFormatter={(v) => `${Math.round(v)}`}
					/>
				</div>
			</div>
		</CollapsibleCard>
	);
}
