import { memo, useCallback, useEffect } from "react";
import type {
	AlgoControlBinding,
	AlgoControlOptionRuntime,
	AlgoControlRuntime,
	LineIndex,
} from "@/components/controls/algo/algoControlTypes";
import ControlKnob from "@/components/controls/ControlKnob";
import AlgoSectionCard from "@/components/editor/AlgoSectionCard";
import Card from "@/components/primitives/Card";
import CzButton from "@/components/primitives/CzButton";
import type { EnvTab } from "@/features/synth/synthUiStore";
import { useSynthUiStore } from "@/features/synth/synthUiStore";
import { getCzPresetDefaults } from "@/lib/synth/algoRef";
import type {
	AlgoControlValueV1,
	CzWaveform,
	StepEnvData,
	WindowType,
} from "@/lib/synth/bindings/synth";
import { ALGO_DEFINITIONS_V1 } from "@/lib/synth/bindings/synth";
import type { PdAlgo } from "@/lib/synth/pdAlgorithms";
import { getPdAlgoDef, PD_ALGOS } from "@/lib/synth/pdAlgorithms";
import PerLineParametersCard from "./PerLineParametersCard";
import { StepEnvelopeEditor } from "./StepEnvelopeEditor";

interface PerLineWarpBlockProps {
	label: string;
	color: string;
	algo: PdAlgo;
	setAlgo: (a: PdAlgo) => void;
	algo2: PdAlgo | null;
	setAlgo2: (a: PdAlgo | null) => void;
	algoBlend: number;
	setAlgoBlend: (v: number) => void;
	warpAmount: number;
	setWarpAmount: (v: number) => void;
	level: number;
	setLevel: (v: number) => void;
	octave: number;
	setOctave: (v: number) => void;
	fineDetune: number;
	setFineDetune: (v: number) => void;
	dcoEnv: StepEnvData;
	setDcoEnv: (e: StepEnvData) => void;
	dcwEnv: StepEnvData;
	setDcwEnv: (e: StepEnvData) => void;
	dcaEnv: StepEnvData;
	setDcaEnv: (e: StepEnvData) => void;
	czSlotAWaveform: CzWaveform;
	setCzSlotAWaveform: (v: CzWaveform) => void;
	czSlotBWaveform: CzWaveform;
	setCzSlotBWaveform: (v: CzWaveform) => void;
	czWindow: WindowType;
	setCzWindow: (v: WindowType) => void;
	keyFollow: number;
	setKeyFollow: (v: number) => void;
	algoControlsA: AlgoControlValueV1[];
	setAlgoControlsA: (value: AlgoControlValueV1[]) => void;
	algoControlsB: AlgoControlValueV1[];
	setAlgoControlsB: (value: AlgoControlValueV1[]) => void;
	/** 1 or 2, used to resolve mod-matrix destinations. Defaults to 1. */
	lineIndex?: LineIndex;
	activeSection?: SectionTab;
}

type SectionTab = "algos" | "envelopes";
type AlgoDefinitionRuntime = {
	id: PdAlgo;
	controls: AlgoControlRuntime[];
};

export const PerLineWarpBlock = memo(function PerLineWarpBlock({
	label,
	color,
	algo,
	setAlgo,
	algo2,
	setAlgo2,
	algoBlend,
	setAlgoBlend,
	warpAmount,
	setWarpAmount,
	level,
	setLevel,
	octave,
	setOctave,
	fineDetune,
	setFineDetune,
	dcoEnv,
	setDcoEnv,
	dcwEnv,
	setDcwEnv,
	dcaEnv,
	setDcaEnv,
	czSlotAWaveform,
	setCzSlotAWaveform,
	czSlotBWaveform,
	setCzSlotBWaveform,
	czWindow,
	setCzWindow,
	keyFollow,
	setKeyFollow,
	algoControlsA = [],
	setAlgoControlsA = () => {},
	algoControlsB = [],
	setAlgoControlsB = () => {},
	lineIndex = 1,
	activeSection: activeSectionProp,
}: PerLineWarpBlockProps) {
	const activeEnvTab = useSynthUiStore((s) => s.activeEnvTab);
	const setActiveEnvTab = useSynthUiStore((s) => s.setActiveEnvTab);
	const activeSection = activeSectionProp;
	const algoBEnabled = algoBlend > 0.001;

	// Auto-set algo2 to first algo when blend is raised from 0 with nothing selected
	useEffect(() => {
		if (algoBlend > 0 && algo2 == null) {
			setAlgo2(PD_ALGOS[0].value);
		}
	}, [algoBlend, algo2, setAlgo2]);

	const envMap: Record<
		EnvTab,
		{
			title: string;
			env: StepEnvData;
			setEnv: (env: StepEnvData) => void;
			envColor: string;
		}
	> = {
		dco: {
			title: `${label} DCO`,
			env: dcoEnv,
			setEnv: setDcoEnv,
			envColor: "#9cb937",
		},
		dcw: {
			title: `${label} DCW`,
			env: dcwEnv,
			setEnv: setDcwEnv,
			envColor: color,
		},
		dca: {
			title: `${label} DCA`,
			env: dcaEnv,
			setEnv: setDcaEnv,
			envColor: "#3dff3d",
		},
	};

	const activeEnv = envMap[activeEnvTab];

	const handleAlgoChange = useCallback(
		(nextAlgo: PdAlgo) => {
			setAlgo(nextAlgo);
			const definitions =
				ALGO_DEFINITIONS_V1 as unknown as AlgoDefinitionRuntime[];
			const nextDefinition = definitions.find((entry) => entry.id === nextAlgo);
			const nextDefaults = (nextDefinition?.controls ?? [])
				.filter((control) => (control.kind ?? "number") === "number")
				.map((control) => ({
					id: control.id,
					value: control.default ?? control.min ?? 0,
				}));
			setAlgoControlsA(nextDefaults);
			const defaults = getCzPresetDefaults(nextAlgo);
			if (!defaults) {
				return;
			}

			setCzSlotAWaveform(defaults.waveform1);
			setCzSlotBWaveform(defaults.waveform2);
			setCzWindow(defaults.windowFunction);
		},
		[
			setAlgo,
			setAlgoControlsA,
			setCzSlotAWaveform,
			setCzSlotBWaveform,
			setCzWindow,
		],
	);

	const handleAlgo2Change = useCallback(
		(nextAlgo: PdAlgo) => {
			setAlgo2(nextAlgo);
			const definitions =
				ALGO_DEFINITIONS_V1 as unknown as AlgoDefinitionRuntime[];
			const nextDefinition = definitions.find((entry) => entry.id === nextAlgo);
			const nextDefaults = (nextDefinition?.controls ?? [])
				.filter((control) => (control.kind ?? "number") === "number")
				.map((control) => ({
					id: control.id,
					value: control.default ?? control.min ?? 0,
				}));
			setAlgoControlsB(nextDefaults);
		},
		[setAlgo2, setAlgoControlsB],
	);
	const czWaveforms: CzWaveform[] = [
		"saw",
		"square",
		"pulse",
		"null",
		"sinePulse",
		"sawPulse",
		"multiSine",
		"pulse2",
	];

	const czWindows: WindowType[] = [
		"off",
		"saw",
		"triangle",
		"trapezoid",
		"pulse",
		"doubleSaw",
	];

	const algoDefinitions =
		ALGO_DEFINITIONS_V1 as unknown as AlgoDefinitionRuntime[];
	const activeAlgoDefinition = algoDefinitions.find(
		(entry) => entry.id === algo,
	);
	const activeAlgoDefinitionB = algoDefinitions.find(
		(entry) => entry.id === (algo2 ?? PD_ALGOS[0].value),
	);
	const algoDefinitionControlsA = activeAlgoDefinition?.controls ?? [];
	const algoDefinitionControlsB = activeAlgoDefinitionB?.controls ?? [];

	// Map each "number"-kind control to a 1-based slot index for ModDestination
	// (line1AlgoParam1…8 / line2AlgoParam1…8). Max 8 slots per line.
	// Algo A takes slots 1..N, Algo B continues from N+1..8.
	const algoParamSlotIndex: Record<string, number> = {};
	let slotCounter = 1;
	for (const ctrl of algoDefinitionControlsA) {
		if ((ctrl.kind ?? "number") === "number") {
			if (slotCounter <= 8) {
				algoParamSlotIndex[ctrl.id] = slotCounter++;
			}
		}
	}
	const algoParamSlotIndexB: Record<string, number> = {};
	for (const ctrl of algoDefinitionControlsB) {
		if ((ctrl.kind ?? "number") === "number") {
			if (slotCounter <= 8) {
				algoParamSlotIndexB[ctrl.id] = slotCounter++;
			}
		}
	}

	const controlBindings: Record<string, AlgoControlBinding> = {
		waveform1: {
			getNumber: () => czWaveforms.indexOf(czSlotAWaveform),
			setNumber: (value: number) => {
				const waveform = czWaveforms[Math.round(value)];
				if (waveform) {
					setCzSlotAWaveform(waveform);
				}
			},
		},
		waveform2: {
			getNumber: () => czWaveforms.indexOf(czSlotBWaveform),
			setNumber: (value: number) => {
				const waveform = czWaveforms[Math.round(value)];
				if (waveform) {
					setCzSlotBWaveform(waveform);
				}
			},
		},
		windowFunction: {
			getNumber: () => czWindows.indexOf(czWindow),
			setNumber: (value: number) => {
				const window = czWindows[Math.round(value)];
				if (window) {
					setCzWindow(window);
				}
			},
		},
	};

	const getAlgoControlValue = (
		entries: AlgoControlValueV1[],
		id: string,
		fallback: number,
	) => {
		const existing = entries.find((entry) => entry.id === id);
		return existing ? existing.value : fallback;
	};

	const setAlgoControlValue = (
		entries: AlgoControlValueV1[],
		setEntries: (value: AlgoControlValueV1[]) => void,
		id: string,
		value: number,
	) => {
		const nextValue = Number.isFinite(value) ? value : 0;
		const index = entries.findIndex((entry) => entry.id === id);
		if (index >= 0) {
			const next = [...entries];
			next[index] = { ...next[index], value: nextValue };
			setEntries(next);
			return;
		}
		setEntries([...entries, { id, value: nextValue }]);
	};

	const applyOptionAssignments = (
		entries: AlgoControlValueV1[],
		setEntries: (value: AlgoControlValueV1[]) => void,
		option: AlgoControlOptionRuntime,
	) => {
		for (const assignment of option.set) {
			const binding = controlBindings[assignment.controlId];
			if (binding?.setNumber) {
				binding.setNumber(assignment.value);
				continue;
			}
			setAlgoControlValue(
				entries,
				setEntries,
				assignment.controlId,
				assignment.value,
			);
		}
	};

	const getActiveSelectOption = (
		entries: AlgoControlValueV1[],
		control: AlgoControlRuntime,
	) => {
		const options = control.options ?? [];
		const binding = controlBindings[control.id];
		if (!binding) {
			return null;
		}

		if (options.some((option) => option.set.length > 0)) {
			return (
				options.find((option) =>
					option.set.every((assignment) => {
						const currentValue =
							controlBindings[assignment.controlId]?.getNumber?.() ??
							getAlgoControlValue(entries, assignment.controlId, Number.NaN);
						if (!Number.isFinite(currentValue)) {
							return false;
						}
						return Math.round(currentValue) === Math.round(assignment.value);
					}),
				) ?? null
			);
		}

		const currentIndex = binding.getNumber?.();
		const dynamicValue = getAlgoControlValue(
			entries,
			control.id,
			control.default ?? 0,
		);
		const selectedIndex = currentIndex ?? dynamicValue;
		if (selectedIndex === undefined) {
			return null;
		}

		return options[Math.round(selectedIndex)] ?? null;
	};

	return (
		<div className="min-w-0 min-h-0 flex-1 flex flex-col">
			<div className="flex flex-1 min-h-0 items-stretch">
				<div className="min-h-0 min-w-0 h-full flex-1 flex flex-col overflow-visible">
					{activeSection === "algos" ? (
						<div className="flex-1 min-h-0 flex flex-col">
							<div className="flex-1 min-h-0 grid gap-4 xl:grid-cols-[minmax(0,1fr)_17rem_minmax(0,1fr)]">
								<AlgoSectionCard
									title="Algo A"
									algoLabel={getPdAlgoDef(algo)?.label}
									value={algo}
									onChange={handleAlgoChange}
									controls={algoDefinitionControlsA}
									controlBindings={controlBindings}
									lineIndex={lineIndex}
									algoParamSlotIndex={algoParamSlotIndex}
									getAlgoControlValue={(id, fallback) =>
										getAlgoControlValue(algoControlsA, id, fallback)
									}
									setAlgoControlValue={(id, value) =>
										setAlgoControlValue(
											algoControlsA,
											setAlgoControlsA,
											id,
											value,
										)
									}
									getActiveSelectOption={(control) =>
										getActiveSelectOption(algoControlsA, control)
									}
									applyOptionAssignments={(option) =>
										applyOptionAssignments(
											algoControlsA,
											setAlgoControlsA,
											option,
										)
									}
								/>
								<div className="flex min-h-0 flex-col gap-4">
									<Card
										variant="subtle"
										className="flex flex-col items-center justify-center "
									>
										<div className="text-3xs uppercase tracking-[0.24em] text-cz-light-blue">
											Algo Bridge
										</div>
										<ControlKnob
											label="Blend"
											value={algoBlend}
											onChange={setAlgoBlend}
											min={0}
											max={1}
											step={0.01}
											size={52}
											defaultValue={0}
											color="#7f9de4"
											modulatable="algoBlend"
											lineIndex={lineIndex}
											valueFormatter={(value) => `${Math.round(value * 100)}%`}
										/>
										<div className="flex w-full items-center justify-between rounded-md border border-cz-border/70 bg-black/20 px-3 py-2 font-mono text-[0.6rem] uppercase tracking-[0.22em] text-cz-cream-dim">
											<span>A</span>
											<span className="text-cz-gold">
												{Math.round((1 - algoBlend) * 100)}%
											</span>
											<span>B</span>
											<span
												className={
													algoBEnabled
														? "text-cz-light-blue"
														: "text-cz-cream-dim/50"
												}
											>
												{Math.round(algoBlend * 100)}%
											</span>
										</div>
									</Card>

									<PerLineParametersCard
										color={color}
										warpAmount={warpAmount}
										setWarpAmount={setWarpAmount}
										level={level}
										setLevel={setLevel}
										octave={octave}
										setOctave={setOctave}
										fineDetune={fineDetune}
										setFineDetune={setFineDetune}
										lineIndex={lineIndex}
									/>
								</div>
								<AlgoSectionCard
									title="Algo B"
									algoLabel={algo2 ? getPdAlgoDef(algo2)?.label : undefined}
									value={algo2 ?? PD_ALGOS[0].value}
									onChange={handleAlgo2Change}
									disabled={!algoBEnabled}
									controls={algoDefinitionControlsB}
									controlBindings={{}}
									lineIndex={lineIndex}
									algoParamSlotIndex={algoParamSlotIndexB}
									getAlgoControlValue={(id, fallback) =>
										getAlgoControlValue(algoControlsB, id, fallback)
									}
									setAlgoControlValue={(id, value) =>
										setAlgoControlValue(
											algoControlsB,
											setAlgoControlsB,
											id,
											value,
										)
									}
									getActiveSelectOption={(control) =>
										getActiveSelectOption(algoControlsB, control)
									}
									applyOptionAssignments={(option) =>
										applyOptionAssignments(
											algoControlsB,
											setAlgoControlsB,
											option,
										)
									}
								/>
							</div>
						</div>
					) : (
						<div className="flex-1 min-h-0 overflow-y-auto p-3">
							<Card variant="subtle" className="p-3 min-w-0">
								<div className="mb-2 text-3xs uppercase tracking-[0.24em] text-cz-cream">
									Envelope Matrix
								</div>
								<div className="mb-2 flex gap-1">
									{(["dco", "dcw", "dca"] as EnvTab[]).map((tab) => (
										<CzButton
											key={tab}
											active={activeEnvTab === tab}
											onClick={() => setActiveEnvTab(tab)}
											className="[&_button]:bg-cz-inset [&_button]:border-cz-border"
										>
											{tab.toUpperCase()}
										</CzButton>
									))}
								</div>
								<StepEnvelopeEditor
									title={activeEnv.title}
									env={activeEnv.env}
									onChange={activeEnv.setEnv}
									color={activeEnv.envColor}
									compact
								/>
								<div className="mt-2 flex items-center gap-2">
									<span className="text-3xs text-cz-cream uppercase tracking-[0.2em]">
										Key Follow:
									</span>
									<input
										type="range"
										min={0}
										max={9}
										value={keyFollow}
										onChange={(e) => setKeyFollow(Number(e.target.value))}
										className="range range-xs"
										style={{ accentColor: "var(--color-cz-gold)" }}
									/>
									<span className="text-xs text-cz-cream w-4">{keyFollow}</span>
								</div>
							</Card>
						</div>
					)}
				</div>
			</div>
		</div>
	);
});

export default PerLineWarpBlock;
