import ChorusModule from "../drawer-modules/ChorusModule";
import DelayModule from "../drawer-modules/DelayModule";
import PhaseModModule from "../drawer-modules/PhaseModModule";
import PhaserModule from "../drawer-modules/PhaserModule";
import ReverbModule from "../drawer-modules/ReverbModule";
import VibratoModule from "../drawer-modules/VibratoModule";

export default function FxConsoleDrawer() {
	return (
		<div className="grid h-full min-h-0 grid-cols-3 grid-rows-2 gap-2">
			<ChorusModule />
			<DelayModule />
			<ReverbModule />
			<VibratoModule />
			<PhaseModModule />
			<PhaserModule />
		</div>
	);
}
