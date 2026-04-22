export type LineIndex = 1 | 2;

export type AlgoControlAssignmentRuntime = {
	controlId: string;
	value: number;
};

export type AlgoControlOptionRuntime = {
	value: string;
	label: string;
	set: AlgoControlAssignmentRuntime[];
};

export type AlgoControlRuntime = {
	id: string;
	label: string;
	description?: string | null;
	kind?: "number" | "select" | "toggle";
	min?: number | null;
	max?: number | null;
	default?: number | null;
	defaultToggle?: boolean | null;
	options?: AlgoControlOptionRuntime[];
};

export type AlgoControlBinding = {
	getNumber?: () => number;
	setNumber?: (value: number) => void;
	getToggle?: () => boolean;
	setToggle?: (value: boolean) => void;
};
