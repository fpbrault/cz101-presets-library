import { AnimatePresence } from "motion/react";
import {
	memo,
	type ReactNode,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { createPortal } from "react-dom";
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

/** Panel dimensions used for edge-flip calculation. */
const PANEL_WIDTH = 248;
const PANEL_HEIGHT_ESTIMATE = 320;

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
	const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({
		position: "fixed",
		zIndex: 9999,
		top: 0,
		left: 0,
	});
	const triggerRef = useRef<HTMLButtonElement | null>(null);
	const panelRef = useRef<HTMLDivElement | null>(null);
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

	/** Compute viewport-fixed panel position diagonally from the badge button. */
	const openPopover = useCallback(() => {
		const btn = triggerRef.current;
		if (!btn) {
			setPopoverOpen(true);
			return;
		}
		const r = btn.getBoundingClientRect();
		const vw = window.innerWidth;
		const vh = window.innerHeight;
		const GAP = 4;

		// Horizontal: prefer right of badge, flip left if not enough space
		const openRight = r.right + GAP + PANEL_WIDTH <= vw;
		const hStyle: React.CSSProperties = openRight
			? { left: r.right + GAP }
			: { left: Math.max(GAP, r.left - PANEL_WIDTH - GAP) };

		// Vertical: prefer below badge, flip above if not enough space
		const openBelow = r.bottom + GAP + PANEL_HEIGHT_ESTIMATE <= vh;
		const vStyle: React.CSSProperties = openBelow
			? { top: r.bottom + GAP }
			: { bottom: vh - r.top + GAP };

		setPanelStyle({ position: "fixed", zIndex: 9999, ...hStyle, ...vStyle });
		setPopoverOpen(true);
	}, []);

	const closePopover = useCallback(() => setPopoverOpen(false), []);

	// Close on outside click (capture phase so it fires before any bubbling stops)
	useEffect(() => {
		if (!popoverOpen) return;
		const handler = (e: PointerEvent) => {
			const target = e.target as Node | null;
			if (
				panelRef.current &&
				!panelRef.current.contains(target) &&
				triggerRef.current &&
				!triggerRef.current.contains(target)
			) {
				closePopover();
			}
		};
		document.addEventListener("pointerdown", handler, true);
		return () => document.removeEventListener("pointerdown", handler, true);
	}, [popoverOpen, closePopover]);

	return (
		<div className="group relative inline-block">
			{children}
			<ModulationIconButton
				hasActiveRoutes={hasActiveRoutes}
				routeCount={activeRoutes.length}
				label={`Modulation for ${label ?? destinationId}`}
				onClick={() => (popoverOpen ? closePopover() : openPopover())}
				forceVisible={popoverOpen}
				className={iconClassName}
				style={iconStyle}
				triggerRef={(el) => {
					triggerRef.current = el;
				}}
			/>

			{createPortal(
				<AnimatePresence>
					{popoverOpen && (
						<div ref={panelRef} style={panelStyle}>
							<ModulationMenu
								title={label ?? destinationId}
								routes={activeRoutes}
								onToggleEnabled={handleToggleEnabled}
								onRemoveRoute={handleRemoveRoute}
								onAmountChange={handleAmountChange}
								onAddRoute={handleAddRoute}
								onClose={closePopover}
							/>
						</div>
					)}
				</AnimatePresence>,
				document.body,
			)}
		</div>
	);
});

export default ModulatableControl;
