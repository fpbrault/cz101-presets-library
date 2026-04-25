import { memo } from "react";
import ControlKnob from "@/components/controls/ControlKnob";
import type { AsidePanelComponent } from "@/components/layout/AsidePanelSwitcher";
import SynthPanelContainer from "@/components/layout/SynthPanelContainer";
import CzButton from "@/components/primitives/CzButton";
import { useSynthParam } from "@/features/synth/SynthParamController";
import { applyVelocityCurve } from "@/lib/synth/velocityCurve";

const W = 80;
const H = 48;
const PAD = 4;
const INNER_W = W - PAD * 2;
const INNER_H = H - PAD * 2;

function buildCurvePath(curve: number): string {
const pts = Array.from({ length: 33 }, (_, i) => {
const x = i / 32;
const y = applyVelocityCurve(x, curve);
return `${(PAD + x * INNER_W).toFixed(1)},${(PAD + (1 - y) * INNER_H).toFixed(1)}`;
});
return `M ${pts.join(" L ")}`;
}

const VelocityCurvePreview = memo(function VelocityCurvePreview({
curve,
}: {
curve: number;
}) {
return (
<svg
width={W}
height={H}
viewBox={`0 0 ${W} ${H}`}
className="rounded border border-cz-border bg-cz-lcd-bg"
style={{ imageRendering: "pixelated" }}
>
{/* Grid lines */}
<line
x1={PAD}
y1={PAD + INNER_H / 2}
x2={PAD + INNER_W}
y2={PAD + INNER_H / 2}
stroke="rgba(255,255,255,0.08)"
strokeWidth={0.5}
/>
<line
x1={PAD + INNER_W / 2}
y1={PAD}
x2={PAD + INNER_W / 2}
y2={PAD + INNER_H}
stroke="rgba(255,255,255,0.08)"
strokeWidth={0.5}
/>
{/* Linear reference */}
<line
x1={PAD}
y1={PAD + INNER_H}
x2={PAD + INNER_W}
y2={PAD}
stroke="rgba(255,255,255,0.15)"
strokeWidth={0.5}
strokeDasharray="2,2"
/>
{/* Curve */}
<path
d={buildCurvePath(curve)}
fill="none"
stroke="#7f9de4"
strokeWidth={1.5}
strokeLinejoin="round"
strokeLinecap="round"
/>
</svg>
);
});

const GlobalVoicePanel: AsidePanelComponent<"global"> = Object.assign(
function GlobalVoicePanel() {
const { value: volume, setValue: setVolume } = useSynthParam("volume");
const { value: polyMode, setValue: setPolyMode } =
useSynthParam("polyMode");
const { value: velocityCurve, setValue: setVelocityCurve } =
useSynthParam("velocityCurve");
const { value: pitchBendRange, setValue: setPitchBendRange } =
useSynthParam("pitchBendRange");
const { value: modWheelVibratoDepth, setValue: setModWheelVibratoDepth } =
useSynthParam("modWheelVibratoDepth");
return (
<SynthPanelContainer>
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
modDestination="volume"
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
<div className="flex items-center justify-center gap-3 pt-1">
<VelocityCurvePreview curve={velocityCurve} />
<ControlKnob
value={velocityCurve}
onChange={setVelocityCurve}
min={-1}
max={1}
size={28}
color="#c46eb4"
label="Vel Curve"
valueFormatter={(v) => (v === 0 ? "Linear" : v.toFixed(2))}
/>
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
</SynthPanelContainer>
);
},
{
panelId: "global" as const,
panelTab: { topLabel: "Global", bottomLabel: "" },
},
);

export default GlobalVoicePanel;
