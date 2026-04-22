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

	const activeRoutes = useMemo(
		() => modMatrix.routes.filter((r) => r.destination === destinationId),
		[modMatrix.routes, destinationId],
	);

	const handleAddRoute = useCallback(
		(source: ModSource) => {
			const newRoute: ModRoute = {
				source,
				destination: destinationId,
				amount: 0.5,
				enabled: true,
			};
			setModMatrix({ routes: [...modMatrix.routes, newRoute] });
		},
		[modMatrix.routes, destinationId, setModMatrix],
	);

	const handleRemoveRoute = useCallback(
		(index: number) => {
			const globalIndex = modMatrix.routes.findIndex(
				(r) =>
					r.destination === destinationId &&
					modMatrix.routes
						.filter((r2) => r2.destination === destinationId)
						.indexOf(r) === index,
			);
			if (globalIndex < 0) return;
			const next = [...modMatrix.routes];
			next.splice(globalIndex, 1);
			setModMatrix({ routes: next });
		},
		[modMatrix.routes, destinationId, setModMatrix],
	);

	const handleAmountChange = useCallback(
		(index: number, amount: number) => {
			let destIdx = -1;
			const next = modMatrix.routes.map((r) => {
				if (r.destination === destinationId) {
					destIdx++;
					if (destIdx === index) return { ...r, amount };
				}
				return r;
			});
			setModMatrix({ routes: next });
		},
		[modMatrix.routes, destinationId, setModMatrix],
	);

	const handleToggleEnabled = useCallback(
		(index: number) => {
			let destIdx = -1;
			const next = modMatrix.routes.map((r) => {
				if (r.destination === destinationId) {
					destIdx++;
					if (destIdx === index) return { ...r, enabled: !r.enabled };
				}
				return r;
			});
			setModMatrix({ routes: next });
		},
		[modMatrix.routes, destinationId, setModMatrix],
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
