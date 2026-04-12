import { BaseFxSection, type FxKnobConfig } from "./BaseFxSection";

interface DelaySectionProps {
	time: number;
	setTime: (v: number) => void;
	feedback: number;
	setFeedback: (v: number) => void;
	mix: number;
	setMix: (v: number) => void;
}

export function DelaySection({
	time,
	setTime,
	feedback,
	setFeedback,
	mix,
	setMix,
}: DelaySectionProps) {
	const knobs: FxKnobConfig[] = [
		{
			label: "Time",
			value: time,
			setValue: setTime,
			min: 0.01,
			max: 1,
			size: 44,
			color: "#c084fc",
			valueFormatter: (value) => `${Math.round(value * 1000)}ms`,
		},
		{
			label: "Dly Fdbk",
			value: feedback,
			setValue: setFeedback,
			min: 0,
			max: 0.9,
			size: 42,
			color: "#e879f9",
			valueFormatter: (value) => `${Math.round(value * 100)}%`,
		},
		{
			label: "Mix",
			value: mix,
			setValue: setMix,
			min: 0,
			max: 1,
			size: 44,
			color: "#a78bfa",
			valueFormatter: (value) => `${Math.round(value * 100)}%`,
		},
	];
	return <BaseFxSection title="Delay" knobs={knobs} />;
}
