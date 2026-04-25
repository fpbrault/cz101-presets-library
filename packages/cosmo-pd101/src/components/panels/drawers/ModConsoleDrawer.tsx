import LfoModule from "../drawer-modules/LFOModule";
import ModEnveloppeModule from "../drawer-modules/ModEnveloppeModule";
import RandomModule from "../drawer-modules/RandomModule";
import ModMatrixPanel from "../modulation-matrix/ModMatrixPanel";

export default function ModConsoleDrawer() {
	return (
		<div className="flex h-full min-h-0 gap-3">
			{/* Left: 2×3 module grid filling full height — row 1: Vibrato + Phase Mod, row 2: LFO 1 + LFO 2, row 3: Random + Mod Env */}
			<div className="flex-2 min-w-0 min-h-0 grid grid-cols-2 grid-rows-2 gap-2">
				<LfoModule id={1} color="#27588f" />
				<LfoModule id={2} color="#d7ac3d" />
				<RandomModule />
				<ModEnveloppeModule />
			</div>

			{/* Right: Mod Matrix panel */}
			<div className="flex-1 min-w-0 min-h-0">
				<ModMatrixPanel />
			</div>
		</div>
	);
}
