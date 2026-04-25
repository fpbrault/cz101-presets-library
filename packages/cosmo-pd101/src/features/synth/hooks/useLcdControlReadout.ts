import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { StepEnvData } from "@/lib/synth/bindings/synth";

type LcdControlReadout = {
	label: string;
	value: string;
};

type UseLcdControlReadoutResult = {
	lcdControlReadout: LcdControlReadout | null;
	pushLcdControlReadout: (key: string, value: unknown) => void;
	formatEnvReadout: (prev: StepEnvData, next: StepEnvData) => string;
};

export function useLcdControlReadout(): UseLcdControlReadoutResult {
	const { t } = useTranslation("synth");
	const [lcdControlReadout, setLcdControlReadout] =
		useState<LcdControlReadout | null>(null);
	const lcdReadoutTimeoutRef = useRef<number | null>(null);

	const formatValue = useCallback(
		(key: string, value: string | number | boolean): string => {
			if (typeof value === "boolean") {
				return value ? t("states.on") : t("states.off");
			}

			if (typeof value === "string") {
				if (key === "polyMode") {
					return value === "poly8" ? t("states.poly8") : t("states.mono");
				}
				if (key === "windowType") return value.toUpperCase();
				if (key === "lineSelect") return value;
				if (key === "modMode") return value.toUpperCase();
				if (key === "filterType") return value.toUpperCase();
				if (key === "lfoWaveform") return value.toUpperCase();
				if (key === "portamentoMode") return value.toUpperCase();
				return value.toUpperCase();
			}

			if (key === "volume")
				return t("units.percent", { value: Math.round(value * 100) });
			if (key === "line1Level" || key === "line2Level")
				return t("units.percent", { value: Math.round(value * 100) });
			if (key === "pitchBendRange")
				return t("units.semitones", { value: Math.round(value) });
			if (key === "vibratoDelay")
				return t("units.milliseconds", { value: Math.round(value) });
			if (key === "filterCutoff")
				return t("units.hertz", { value: Math.round(value) });
			if (key === "delayTime" || key === "portamentoTime")
				return t("units.seconds", { value: value.toFixed(2) });
			if (
				key === "chorusMix" ||
				key === "delayMix" ||
				key === "reverbMix" ||
				key === "reverbCharacter" ||
				key === "filterResonance" ||
				key === "filterEnvAmount"
			) {
				return t("units.decimal", { value });
			}
			if (
				key === "intPmAmount" ||
				key === "intPmRatio" ||
				key === "chorusRate" ||
				key === "chorusDepth" ||
				key === "reverbSize" ||
				key === "scopeVerticalZoom"
			) {
				return t("units.decimal", { value });
			}

			return Number.isInteger(value) ? `${value}` : value.toFixed(2);
		},
		[t],
	);

	const pushLcdControlReadout = useCallback(
		(key: string, value: unknown) => {
			const label = t(`lcdControls.${key}`, { defaultValue: key });
			if (
				typeof value !== "string" &&
				typeof value !== "number" &&
				typeof value !== "boolean"
			) {
				return;
			}

			setLcdControlReadout({
				label,
				value: formatValue(key, value),
			});
			if (lcdReadoutTimeoutRef.current != null) {
				window.clearTimeout(lcdReadoutTimeoutRef.current);
			}
			lcdReadoutTimeoutRef.current = window.setTimeout(() => {
				setLcdControlReadout(null);
			}, 1200);
		},
		[t, formatValue],
	);

	const formatEnvReadout = useCallback(
		(prev: StepEnvData, next: StepEnvData): string => {
			if (prev.stepCount !== next.stepCount) {
				return `STEPS ${next.stepCount}`;
			}
			if (prev.loop !== next.loop) {
				return `LOOP ${next.loop ? "ON" : "OFF"}`;
			}
			if (prev.sustainStep !== next.sustainStep) {
				return `SUS S${next.sustainStep + 1}`;
			}

			const maxSteps = Math.max(prev.steps.length, next.steps.length);
			for (let index = 0; index < maxSteps; index++) {
				const prevStep = prev.steps[index];
				const nextStep = next.steps[index];
				if (!nextStep) continue;
				if (
					!prevStep ||
					prevStep.level !== nextStep.level ||
					prevStep.rate !== nextStep.rate
				) {
					const level = Math.round(nextStep.level * 99);
					const rate = Math.round(nextStep.rate);
					return `S${index + 1} L${level} R${rate}`;
				}
			}

			const sustainIndex = Math.max(
				0,
				Math.min(next.sustainStep, next.steps.length - 1),
			);
			const sustain = next.steps[sustainIndex];
			const sustainLevel = Math.round((sustain?.level ?? 0) * 99);
			const sustainRate = Math.round(sustain?.rate ?? 0);
			return `S${sustainIndex + 1} L${sustainLevel} R${sustainRate}`;
		},
		[],
	);

	useEffect(() => {
		return () => {
			if (lcdReadoutTimeoutRef.current != null) {
				window.clearTimeout(lcdReadoutTimeoutRef.current);
			}
		};
	}, []);

	return {
		lcdControlReadout,
		pushLcdControlReadout,
		formatEnvReadout,
	};
}
