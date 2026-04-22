import { memo, type ReactNode, useCallback, useMemo, useState } from "react";
import { useModMatrix } from "@/context/ModMatrixContext";
import type {
	ModDestination,
	ModRoute,
	ModSource,
} from "@/lib/synth/bindings/synth";
import ModulationIconButton from "./ModulationIconButton";
import ModulationMenu from "./ModulationMenu";

interface ModulatableControlProps {
	/** The mod-matrix destination this control maps to. */
	destinationId: ModDestination;
	/** The label shown next to the mod indicator. */
	label?: string;
	children: ReactNode;
	iconClassName?: string;
	iconStyle?: React.CSSProperties;
}

/**
 * Wraps any synth control (knob, slider) with a modulation indicator badge
 * and an affordance to add/edit/remove mod-matrix routes for the control's
 * destination.
 */
const ModulatableControl = memo(function ModulatableControl({
	destinationId,
	label,
	children,
	iconClassName,
	iconStyle,
}: ModulatableControlProps) {
	const { modMatrix, setModMatrix } = useModMatrix();
	const [popoverOpen, setPopoverOpen] = useState(false);
	const routes = modMatrix.routes ?? [];

	const activeRoutes = useMemo(
		() => routes.filter((r) => r.destination === destinationId),
		[routes, destinationId],
	);

	const handleAddRoute = useCallback(
		(source: ModSource) => {
			const newRoute: ModRoute = {
				source,
				destination: destinationId,
				amount: 0.5,
				enabled: true,
			};
			setModMatrix({ routes: [...routes, newRoute] });
		},
		[routes, destinationId, setModMatrix],
	);

	const handleRemoveRoute = useCallback(
		(index: number) => {
			let destinationIndex = -1;
			const globalIndex = routes.findIndex((r) => {
				if (r.destination !== destinationId) {
					return false;
				}
				destinationIndex += 1;
				return destinationIndex === index;
			});
			if (globalIndex < 0) return;
			const next = [...routes];
			next.splice(globalIndex, 1);
			setModMatrix({ routes: next });
		},
		[routes, destinationId, setModMatrix],
	);

	const handleAmountChange = useCallback(
		(index: number, amount: number) => {
			let destIdx = -1;
			const next = routes.map((r) => {
				if (r.destination === destinationId) {
					destIdx++;
					if (destIdx === index) return { ...r, amount };
				}
				return r;
			});
			setModMatrix({ routes: next });
		},
		[routes, destinationId, setModMatrix],
	);

	const handleToggleEnabled = useCallback(
		(index: number) => {
			let destIdx = -1;
			const next = routes.map((r) => {
				if (r.destination === destinationId) {
					destIdx++;
					if (destIdx === index) return { ...r, enabled: !r.enabled };
				}
				return r;
			});
			setModMatrix({ routes: next });
		},
		[routes, destinationId, setModMatrix],
	);

	const hasActiveRoutes = activeRoutes.length > 0;

	return (
		<div className="group relative inline-block">
			{children}
			<ModulationIconButton
				hasActiveRoutes={hasActiveRoutes}
				routeCount={activeRoutes.length}
				label={`Modulation for ${label ?? destinationId}`}
				onClick={() => setPopoverOpen((v) => !v)}
				forceVisible={popoverOpen}
				className={iconClassName}
				style={iconStyle}
			/>

			{popoverOpen && (
				<ModulationMenu
					title={label ?? destinationId}
					routes={activeRoutes}
					onToggleEnabled={handleToggleEnabled}
					onRemoveRoute={handleRemoveRoute}
					onAmountChange={handleAmountChange}
					onAddRoute={handleAddRoute}
					onClose={() => setPopoverOpen(false)}
				/>
			)}
		</div>
	);
});

export default ModulatableControl;
