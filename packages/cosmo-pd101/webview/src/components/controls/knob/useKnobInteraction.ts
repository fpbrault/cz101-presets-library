import { useCallback, useEffect, useRef, useState } from "react";
import {
	type ArcGeometry,
	clampValue,
	DEFAULT_ARC_GEOMETRY,
	denormalizeValue,
	isOnHandle,
	normalizeValue,
	snapToStep,
	svgPointToNorm,
} from "./knobGeometry";

export interface UseKnobInteractionProps {
	value: number;
	min: number;
	max: number;
	step?: number;
	defaultValue?: number;
	/** Pixels of vertical drag required to traverse the full range. Default 200. */
	sensitivity?: number;
	/** Divisor applied to sensitivity when Shift is held. Default 5. */
	fineSensitivity?: number;
	/** Normalized step per wheel tick. Default 0.01. */
	wheelStep?: number;
	/** Normalized step per wheel tick when Shift is held. Default 0.002. */
	fineWheelStep?: number;
	disabled?: boolean;
	onChange: (value: number) => void;
	arcGeometry?: ArcGeometry;
	/** Ref to the SVG element for coordinate transforms (angular drag). */
	svgRef: React.RefObject<SVGSVGElement | null>;
	/** Ref to the interactive element for attaching non-passive wheel listener. */
	buttonRef: React.RefObject<HTMLButtonElement | null>;
}

export interface UseKnobInteractionResult {
	dragging: boolean;
	editing: boolean;
	editValue: string;
	inputRef: React.RefObject<HTMLInputElement | null>;
	onPointerDown: (e: React.PointerEvent) => void;
	onDoubleClick: (e: React.MouseEvent) => void;
	onKeyDown: (e: React.KeyboardEvent) => void;
	beginEdit: (currentDisplay: string) => void;
	commitEdit: () => void;
	cancelEdit: () => void;
	setEditValue: (v: string) => void;
	onEditKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
	onEditBlur: () => void;
}

export function useKnobInteraction({
	value,
	min,
	max,
	step,
	defaultValue,
	sensitivity = 200,
	fineSensitivity = 5,
	wheelStep = 0.01,
	fineWheelStep = 0.002,
	disabled = false,
	onChange,
	arcGeometry = DEFAULT_ARC_GEOMETRY,
	svgRef,
	buttonRef,
}: UseKnobInteractionProps): UseKnobInteractionResult {
	const [dragging, setDragging] = useState(false);
	const [editing, setEditing] = useState(false);
	const [editValue, setEditValue] = useState("");
	const inputRef = useRef<HTMLInputElement>(null);
	const lastTouchTapAtRef = useRef(0);

	const dragState = useRef<{
		mode: "linear" | "angular";
		startSvgY: number;
		startValue: number;
		isShift: boolean;
	} | null>(null);

	// Emit a domain value, applying step quantization and clamping.
	const emit = useCallback(
		(raw: number) => {
			const clamped = clampValue(raw, min, max);
			const snapped = snapToStep(clamped, step, min, max);
			onChange(snapped);
		},
		[min, max, step, onChange],
	);

	// Convert client coordinates to SVG-local space, accounting for host scaling.
	const toSvgPoint = useCallback(
		(clientX: number, clientY: number): { x: number; y: number } => {
			const svg = svgRef.current;
			if (!svg) return { x: clientX, y: clientY };
			const pt = svg.createSVGPoint();
			if (typeof pt.matrixTransform !== "function") {
				return { x: clientX, y: clientY };
			}
			pt.x = clientX;
			pt.y = clientY;
			const ctm = svg.getScreenCTM();
			if (!ctm || typeof ctm.inverse !== "function") {
				return { x: clientX, y: clientY };
			}
			const svgPt = pt.matrixTransform(ctm.inverse());
			return { x: svgPt.x, y: svgPt.y };
		},
		[svgRef],
	);

	const onPointerDown = useCallback(
		(e: React.PointerEvent) => {
			if (disabled) return;

			if (e.pointerType === "touch") {
				const now = Date.now();
				const isDoubleTouch = now - lastTouchTapAtRef.current <= 300;
				lastTouchTapAtRef.current = now;

				if (isDoubleTouch && defaultValue !== undefined) {
					e.preventDefault();
					dragState.current = null;
					setDragging(false);
					emit(defaultValue);
					lastTouchTapAtRef.current = 0;
					return;
				}
			}

			e.preventDefault();
			(e.currentTarget as Element).setPointerCapture(e.pointerId);
			const pt = toSvgPoint(e.clientX, e.clientY);
			const norm = normalizeValue(value, min, max);
			const mode = isOnHandle(pt.x, pt.y, norm, arcGeometry)
				? "angular"
				: "linear";
			dragState.current = {
				mode,
				startSvgY: pt.y,
				startValue: value,
				isShift: e.shiftKey,
			};
			setDragging(true);
		},
		[disabled, defaultValue, toSvgPoint, value, min, max, arcGeometry, emit],
	);

	const onDoubleClick = useCallback(
		(e: React.MouseEvent) => {
			if (disabled) return;
			e.preventDefault();
			if (defaultValue !== undefined) {
				emit(defaultValue);
			}
		},
		[disabled, defaultValue, emit],
	);

	const onKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (disabled) return;
			const currentNorm = normalizeValue(value, min, max);
			const stepNorm = step && max > min ? step / (max - min) : undefined;
			const delta = e.shiftKey
				? (stepNorm ?? fineWheelStep)
				: (stepNorm ?? wheelStep);
			switch (e.key) {
				case "ArrowUp":
				case "ArrowRight":
					e.preventDefault();
					emit(
						denormalizeValue(clampValue(currentNorm + delta, 0, 1), min, max),
					);
					break;
				case "ArrowDown":
				case "ArrowLeft":
					e.preventDefault();
					emit(
						denormalizeValue(clampValue(currentNorm - delta, 0, 1), min, max),
					);
					break;
				case "Home":
					e.preventDefault();
					emit(min);
					break;
				case "End":
					e.preventDefault();
					emit(max);
					break;
			}
		},
		[disabled, value, min, max, step, wheelStep, fineWheelStep, emit],
	);

	const beginEdit = useCallback(
		(currentDisplay: string) => {
			if (disabled) return;
			setEditValue(currentDisplay);
			setEditing(true);
		},
		[disabled],
	);

	const commitEdit = useCallback(() => {
		setEditing(false);
		const parsed = Number.parseFloat(editValue);
		if (!Number.isNaN(parsed)) {
			emit(parsed);
		}
	}, [editValue, emit]);

	const cancelEdit = useCallback(() => {
		setEditing(false);
	}, []);

	const onEditKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLInputElement>) => {
			if (e.key === "Enter") commitEdit();
			else if (e.key === "Escape") cancelEdit();
		},
		[commitEdit, cancelEdit],
	);

	const onEditBlur = useCallback(() => {
		commitEdit();
	}, [commitEdit]);

	// Pointer move/up while dragging — attached to window for capture outside element.
	useEffect(() => {
		if (!dragging) return;

		const handlePointerMove = (e: PointerEvent) => {
			const state = dragState.current;
			if (!state) return;
			if (state.mode === "angular") {
				const pt = toSvgPoint(e.clientX, e.clientY);
				const norm = svgPointToNorm(pt.x, pt.y, arcGeometry);
				emit(denormalizeValue(norm, min, max));
			} else {
				const pt = toSvgPoint(e.clientX, e.clientY);
				const deltaY = state.startSvgY - pt.y;
				// Shift can be held mid-drag to switch to fine mode
				const effectiveSensitivity =
					state.isShift || e.shiftKey
						? sensitivity * fineSensitivity
						: sensitivity;
				// Scale deltaY from SVG space back to screen space for sensitivity
				const screenRatio = svgRef.current
					? (svgRef.current.getBoundingClientRect().height || 1) /
						(arcGeometry.viewBoxSize || 1)
					: 1;
				const nextValue =
					state.startValue +
					((deltaY * screenRatio) / effectiveSensitivity) * (max - min);
				emit(nextValue);
			}
		};

		const handlePointerUp = () => {
			dragState.current = null;
			setDragging(false);
		};

		window.addEventListener("pointermove", handlePointerMove);
		window.addEventListener("pointerup", handlePointerUp);
		return () => {
			window.removeEventListener("pointermove", handlePointerMove);
			window.removeEventListener("pointerup", handlePointerUp);
		};
	}, [
		dragging,
		min,
		max,
		sensitivity,
		fineSensitivity,
		arcGeometry,
		toSvgPoint,
		emit,
		svgRef,
	]);

	// Focus the text input when editing starts.
	useEffect(() => {
		if (editing && inputRef.current) {
			inputRef.current.focus();
			inputRef.current.select();
		}
	}, [editing]);

	// Non-passive wheel listener on the button element to allow preventDefault.
	useEffect(() => {
		const el = buttonRef.current;
		if (!el || disabled) return;

		const handleWheel = (e: WheelEvent) => {
			e.preventDefault();
			// Correct for natural scroll inversion (macOS)
			const rawDeltaY = (
				e as WheelEvent & { webkitDirectionInvertedFromDevice?: boolean }
			).webkitDirectionInvertedFromDevice
				? -e.deltaY
				: e.deltaY;
			const delta = e.shiftKey ? fineWheelStep : wheelStep;
			const direction = rawDeltaY > 0 ? -1 : 1;
			const currentNorm = normalizeValue(value, min, max);
			emit(
				denormalizeValue(
					clampValue(currentNorm + direction * delta, 0, 1),
					min,
					max,
				),
			);
		};

		el.addEventListener("wheel", handleWheel, { passive: false });
		return () => el.removeEventListener("wheel", handleWheel);
	}, [buttonRef, disabled, value, min, max, wheelStep, fineWheelStep, emit]);

	return {
		dragging,
		editing,
		editValue,
		inputRef,
		onPointerDown,
		onDoubleClick,
		onKeyDown,
		beginEdit,
		commitEdit,
		cancelEdit,
		setEditValue,
		onEditKeyDown,
		onEditBlur,
	};
}
