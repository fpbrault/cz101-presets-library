import { act, renderHook } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { useKnobInteraction } from "./useKnobInteraction";

function makeRefs() {
	const svgRef = createRef<SVGSVGElement>();
	const buttonRef = createRef<HTMLButtonElement>();
	return { svgRef, buttonRef };
}

describe("useKnobInteraction – text editing", () => {
	it("beginEdit opens editing state with current display", () => {
		const { svgRef, buttonRef } = makeRefs();
		const { result } = renderHook(() =>
			useKnobInteraction({
				value: 0.5,
				min: 0,
				max: 1,
				onChange: vi.fn(),
				svgRef,
				buttonRef,
			}),
		);

		act(() => result.current.beginEdit("0.50"));

		expect(result.current.editing).toBe(true);
		expect(result.current.editValue).toBe("0.50");
	});

	it("cancelEdit closes editing without calling onChange", () => {
		const onChange = vi.fn();
		const { svgRef, buttonRef } = makeRefs();
		const { result } = renderHook(() =>
			useKnobInteraction({
				value: 0.5,
				min: 0,
				max: 1,
				onChange,
				svgRef,
				buttonRef,
			}),
		);

		act(() => result.current.beginEdit("0.50"));
		act(() => result.current.cancelEdit());

		expect(result.current.editing).toBe(false);
		expect(onChange).not.toHaveBeenCalled();
	});

	it("commitEdit calls onChange with parsed float", () => {
		const onChange = vi.fn();
		const { svgRef, buttonRef } = makeRefs();
		const { result } = renderHook(() =>
			useKnobInteraction({
				value: 0.5,
				min: 0,
				max: 1,
				onChange,
				svgRef,
				buttonRef,
			}),
		);

		act(() => result.current.beginEdit("0.50"));
		act(() => result.current.setEditValue("0.75"));
		act(() => result.current.commitEdit());

		expect(onChange).toHaveBeenCalledWith(0.75);
		expect(result.current.editing).toBe(false);
	});

	it("commitEdit clamps to max", () => {
		const onChange = vi.fn();
		const { svgRef, buttonRef } = makeRefs();
		const { result } = renderHook(() =>
			useKnobInteraction({
				value: 0.5,
				min: 0,
				max: 1,
				onChange,
				svgRef,
				buttonRef,
			}),
		);

		act(() => result.current.beginEdit("0.50"));
		act(() => result.current.setEditValue("5"));
		act(() => result.current.commitEdit());

		expect(onChange).toHaveBeenCalledWith(1);
	});

	it("commitEdit clamps to min", () => {
		const onChange = vi.fn();
		const { svgRef, buttonRef } = makeRefs();
		const { result } = renderHook(() =>
			useKnobInteraction({
				value: 0.5,
				min: 0,
				max: 1,
				onChange,
				svgRef,
				buttonRef,
			}),
		);

		act(() => result.current.beginEdit("0.50"));
		act(() => result.current.setEditValue("-2"));
		act(() => result.current.commitEdit());

		expect(onChange).toHaveBeenCalledWith(0);
	});

	it("commitEdit with NaN does not call onChange", () => {
		const onChange = vi.fn();
		const { svgRef, buttonRef } = makeRefs();
		const { result } = renderHook(() =>
			useKnobInteraction({
				value: 0.5,
				min: 0,
				max: 1,
				onChange,
				svgRef,
				buttonRef,
			}),
		);

		act(() => result.current.beginEdit("0.50"));
		act(() => result.current.setEditValue("abc"));
		act(() => result.current.commitEdit());

		expect(onChange).not.toHaveBeenCalled();
	});

	it("onEditKeyDown Enter commits, Escape cancels", () => {
		const onChange = vi.fn();
		const { svgRef, buttonRef } = makeRefs();
		const { result } = renderHook(() =>
			useKnobInteraction({
				value: 0.5,
				min: 0,
				max: 1,
				onChange,
				svgRef,
				buttonRef,
			}),
		);

		act(() => result.current.beginEdit("0.50"));
		act(() => result.current.setEditValue("0.9"));
		act(() =>
			result.current.onEditKeyDown({
				key: "Enter",
			} as React.KeyboardEvent<HTMLInputElement>),
		);
		expect(onChange).toHaveBeenCalledWith(0.9);

		act(() => result.current.beginEdit("0.50"));
		act(() => result.current.setEditValue("0.2"));
		act(() =>
			result.current.onEditKeyDown({
				key: "Escape",
			} as React.KeyboardEvent<HTMLInputElement>),
		);
		// cancelEdit — onChange not called again
		expect(onChange).toHaveBeenCalledTimes(1);
	});
});

describe("useKnobInteraction – keyboard", () => {
	it("ArrowUp increases value by wheelStep", () => {
		const onChange = vi.fn();
		const { svgRef, buttonRef } = makeRefs();
		const { result } = renderHook(() =>
			useKnobInteraction({
				value: 0.5,
				min: 0,
				max: 1,
				wheelStep: 0.1,
				onChange,
				svgRef,
				buttonRef,
			}),
		);

		act(() =>
			result.current.onKeyDown({
				key: "ArrowUp",
				shiftKey: false,
				preventDefault: vi.fn(),
			} as unknown as React.KeyboardEvent),
		);

		expect(onChange).toHaveBeenCalledWith(expect.closeTo(0.6, 5));
	});

	it("ArrowDown decreases value by wheelStep", () => {
		const onChange = vi.fn();
		const { svgRef, buttonRef } = makeRefs();
		const { result } = renderHook(() =>
			useKnobInteraction({
				value: 0.5,
				min: 0,
				max: 1,
				wheelStep: 0.1,
				onChange,
				svgRef,
				buttonRef,
			}),
		);

		act(() =>
			result.current.onKeyDown({
				key: "ArrowDown",
				shiftKey: false,
				preventDefault: vi.fn(),
			} as unknown as React.KeyboardEvent),
		);

		expect(onChange).toHaveBeenCalledWith(expect.closeTo(0.4, 5));
	});

	it("Home sets value to min", () => {
		const onChange = vi.fn();
		const { svgRef, buttonRef } = makeRefs();
		const { result } = renderHook(() =>
			useKnobInteraction({
				value: 0.5,
				min: 0,
				max: 1,
				onChange,
				svgRef,
				buttonRef,
			}),
		);

		act(() =>
			result.current.onKeyDown({
				key: "Home",
				shiftKey: false,
				preventDefault: vi.fn(),
			} as unknown as React.KeyboardEvent),
		);

		expect(onChange).toHaveBeenCalledWith(0);
	});

	it("End sets value to max", () => {
		const onChange = vi.fn();
		const { svgRef, buttonRef } = makeRefs();
		const { result } = renderHook(() =>
			useKnobInteraction({
				value: 0.5,
				min: 0,
				max: 1,
				onChange,
				svgRef,
				buttonRef,
			}),
		);

		act(() =>
			result.current.onKeyDown({
				key: "End",
				shiftKey: false,
				preventDefault: vi.fn(),
			} as unknown as React.KeyboardEvent),
		);

		expect(onChange).toHaveBeenCalledWith(1);
	});

	it("Shift+ArrowUp uses fine step", () => {
		const onChange = vi.fn();
		const { svgRef, buttonRef } = makeRefs();
		const { result } = renderHook(() =>
			useKnobInteraction({
				value: 0.5,
				min: 0,
				max: 1,
				wheelStep: 0.1,
				fineWheelStep: 0.01,
				onChange,
				svgRef,
				buttonRef,
			}),
		);

		act(() =>
			result.current.onKeyDown({
				key: "ArrowUp",
				shiftKey: true,
				preventDefault: vi.fn(),
			} as unknown as React.KeyboardEvent),
		);

		expect(onChange).toHaveBeenCalledWith(expect.closeTo(0.51, 5));
	});

	it("does nothing for unrecognized keys", () => {
		const onChange = vi.fn();
		const { svgRef, buttonRef } = makeRefs();
		const { result } = renderHook(() =>
			useKnobInteraction({
				value: 0.5,
				min: 0,
				max: 1,
				onChange,
				svgRef,
				buttonRef,
			}),
		);

		act(() =>
			result.current.onKeyDown({
				key: "a",
				shiftKey: false,
				preventDefault: vi.fn(),
			} as unknown as React.KeyboardEvent),
		);

		expect(onChange).not.toHaveBeenCalled();
	});

	it("does nothing when disabled", () => {
		const onChange = vi.fn();
		const { svgRef, buttonRef } = makeRefs();
		const { result } = renderHook(() =>
			useKnobInteraction({
				value: 0.5,
				min: 0,
				max: 1,
				disabled: true,
				onChange,
				svgRef,
				buttonRef,
			}),
		);

		act(() =>
			result.current.onKeyDown({
				key: "ArrowUp",
				shiftKey: false,
				preventDefault: vi.fn(),
			} as unknown as React.KeyboardEvent),
		);

		expect(onChange).not.toHaveBeenCalled();
	});
});

describe("useKnobInteraction – double-click reset", () => {
	it("resets to defaultValue on double-click", () => {
		const onChange = vi.fn();
		const { svgRef, buttonRef } = makeRefs();
		const { result } = renderHook(() =>
			useKnobInteraction({
				value: 0.7,
				min: 0,
				max: 1,
				defaultValue: 0.3,
				onChange,
				svgRef,
				buttonRef,
			}),
		);

		act(() =>
			result.current.onDoubleClick({
				preventDefault: vi.fn(),
			} as unknown as React.MouseEvent),
		);

		expect(onChange).toHaveBeenCalledWith(0.3);
	});

	it("does nothing on double-click when no defaultValue", () => {
		const onChange = vi.fn();
		const { svgRef, buttonRef } = makeRefs();
		const { result } = renderHook(() =>
			useKnobInteraction({
				value: 0.7,
				min: 0,
				max: 1,
				onChange,
				svgRef,
				buttonRef,
			}),
		);

		act(() =>
			result.current.onDoubleClick({
				preventDefault: vi.fn(),
			} as unknown as React.MouseEvent),
		);

		expect(onChange).not.toHaveBeenCalled();
	});
});
