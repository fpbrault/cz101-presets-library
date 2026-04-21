import { memo, useCallback, useEffect, useState } from "react";
import { getCzPresetDefaults } from "@/lib/synth/algoRef";
import type {
	AlgoControlValueV1,
	CzWaveform,
	ModDestination,
	StepEnvData,
	WindowType,
} from "@/lib/synth/bindings/synth";
import { ALGO_DEFINITIONS_V1 } from "@/lib/synth/bindings/synth";
import AlgoIconGrid from "./AlgoIconGrid";
import type { PdAlgo } from "./pdAlgorithms";
import { getPdAlgoDef, PD_ALGOS } from "./pdAlgorithms";
import { StepEnvelopeEditor } from "./StepEnvelopeEditor";
import Card from "./ui/Card";
import CzButton from "./ui/CzButton";
import CzHorizontalSlider from "./ui/CzHorizontalSlider";
import CzVerticalSlider from "./ui/CzVerticalSlider";

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
	dcwComp: number;
	setDcwComp: (v: number) => void;
	level: number;
	setLevel: (v: number) => void;
	octave: number;
	setOctave: (v: number) => void;
	fineDetune: number;
	setFineDetune: (v: number) => void;
	dcoDepth: number;
	setDcoDepth: (v: number) => void;
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
	algoControls: AlgoControlValueV1[];
	setAlgoControls: (value: AlgoControlValueV1[]) => void;
	/** 1 or 2, used to resolve mod-matrix destinations. Defaults to 1. */
	lineIndex?: 1 | 2;
	activeSection?: SectionTab;
}

type EnvTab = "dco" | "dcw" | "dca";
type SectionTab = "algos" | "envelopes";
type AlgoControlAssignmentRuntime = {
	controlId: string;
	value: number;
};
type AlgoControlOptionRuntime = {
	value: string;
	label: string;
	set: AlgoControlAssignmentRuntime[];
};
type AlgoControlRuntime = {
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
type AlgoDefinitionRuntime = {
	id: PdAlgo;
	controls: AlgoControlRuntime[];
};
type AlgoControlBinding = {
	getNumber?: () => number;
	setNumber?: (value: number) => void;
	getToggle?: () => boolean;
	setToggle?: (value: boolean) => void;
};

function AlgoControlTooltip({ description }: { description?: string | null }) {
	if (!description) {
		return null;
	}

	return (
		<div
			className="tooltip tooltip-right z-50 [&:before]:bg-cz-body [&:before]:text-left [&:before]:text-xs normal-case [&:before]:leading-tight	"
			data-tip={description}
		>
			<button
				type="button"
				className="btn btn-ghost btn-circle btn-xs h-4 min-h-4 w-4 border border-cz-border p-0 text-2xs font-semibold leading-none text-cz-cream/70 hover:border-cz-light-blue hover:text-cz-light-blue"
				aria-label="Show control description"
			>
				?
			</button>
		</div>
	);
}

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
	dcwComp,
	setDcwComp,
	level,
	setLevel,
	octave,
	setOctave,
	fineDetune,
	setFineDetune,
	dcoDepth,
	setDcoDepth,
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
	algoControls = [],
	setAlgoControls = () => {},
	lineIndex = 1,
	activeSection: activeSectionProp,
}: PerLineWarpBlockProps) {
	const [activeEnvTab, setActiveEnvTab] = useState<EnvTab>("dcw");
	const activeSection = activeSectionProp;

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
			setAlgoControls(nextDefaults);
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
			setAlgoControls,
			setCzSlotAWaveform,
			setCzSlotBWaveform,
			setCzWindow,
		],
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
	const algoDefinitionControls = activeAlgoDefinition?.controls ?? [];

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

	const getAlgoControlValue = (id: string, fallback: number) => {
		const existing = algoControls.find((entry) => entry.id === id);
		return existing ? existing.value : fallback;
	};

	const setAlgoControlValue = (id: string, value: number) => {
		const nextValue = Number.isFinite(value) ? value : 0;
		const index = algoControls.findIndex((entry) => entry.id === id);
		if (index >= 0) {
			const next = [...algoControls];
			next[index] = { ...next[index], value: nextValue };
			setAlgoControls(next);
			return;
		}
		setAlgoControls([...algoControls, { id, value: nextValue }]);
	};

	const applyOptionAssignments = (option: AlgoControlOptionRuntime) => {
		for (const assignment of option.set) {
			const binding = controlBindings[assignment.controlId];
			if (binding?.setNumber) {
				binding.setNumber(assignment.value);
				continue;
			}
			setAlgoControlValue(assignment.controlId, assignment.value);
		}
	};

	const getActiveSelectOption = (control: AlgoControlRuntime) => {
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
							getAlgoControlValue(assignment.controlId, Number.NaN);
						if (!Number.isFinite(currentValue)) {
							return false;
						}
						return Math.round(currentValue) === Math.round(assignment.value);
					}),
				) ?? null
			);
		}

		const currentIndex = binding.getNumber?.();
		const dynamicValue = getAlgoControlValue(control.id, control.default ?? 0);
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
						<div className="flex-1 min-h-0 flex flex-col p-3">
							<div className="flex-1 min-h-0 grid gap-4 md:grid-cols-3 md:grid-rows-[auto_minmax(0,1fr)]">
								<Card variant="subtle" className="p-3 col-span-1">
									<div className="flex justify-between">
										<div className="mb-2 text-3xs uppercase tracking-[0.24em] text-cz-cream">
											Algo A
										</div>
										<span className="text-3xs uppercase tracking-[0.2em] text-cz-light-blue font-bold">
											{getPdAlgoDef(algo)?.label}
										</span>
									</div>
									<AlgoIconGrid
										value={algo}
										onChange={handleAlgoChange}
										size={36}
									/>
								</Card>
								<Card variant="subtle" className="p-3 col-span-1">
									<div className="flex justify-between">
										<div className="mb-2 text-3xs uppercase tracking-[0.24em] text-cz-cream">
											Algo B
										</div>
										<span className="text-3xs uppercase tracking-[0.2em] text-cz-light-blue font-bold">
											{algo2 ? getPdAlgoDef(algo2)?.label : undefined}
										</span>
									</div>
									<AlgoIconGrid
										value={algo2 ?? PD_ALGOS[0].value}
										onChange={setAlgo2}
										size={36}
										disabled={algoBlend === 0}
									/>
									<div className="space-y-3 mt-2">
										<div className="flex items-center justify-between text-3xs uppercase tracking-[0.2em] text-cz-cream">
											<span>Blend</span>
											<span>{Math.round(algoBlend * 100)}%</span>
										</div>
										<input
											type="range"
											min={0}
											max={100}
											value={Math.round(algoBlend * 100)}
											onChange={(e) =>
												setAlgoBlend(Number(e.target.value) / 100)
											}
											className="range range-xs w-full gh"
											style={{ accentColor: "#9cb937", touchAction: "none" }}
										/>
									</div>
								</Card>

								<Card
									variant="subtle"
									className="p-3 md:col-span-1 min-h-0 flex flex-col"
								>
									<div className="mb-3 text-3xs uppercase tracking-[0.24em] text-cz-cream">
										Parameters
									</div>
									<div className="flex-1 min-h-0 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 items-stretch">
										{(
											[
												{
													label: "DCW Amt",
													value: warpAmount,
													min: 0,
													max: 1,
													step: 0.01,
													color: color,
													fmt: (v: number) => v.toFixed(2),
													onChange: setWarpAmount,
													modDest: (lineIndex === 1 ? "line1DcwBase" : "line2DcwBase") as ModDestination,
												},
												{
													label: "DCW Comp",
													value: dcwComp,
													min: 0,
													max: 1,
													step: 0.01,
													color: "#7f9de4",
													fmt: (v: number) => `${Math.round(v * 100)}%`,
													onChange: setDcwComp,
													modDest: (lineIndex === 1 ? "line1DcwComp" : "line2DcwComp") as ModDestination,
												},
												{
													label: "Level",
													value: level,
													min: 0,
													max: 1,
													step: 0.01,
													color: "#9cb937",
													fmt: (v: number) => `${Math.round(v * 100)}%`,
													onChange: setLevel,
													modDest: (lineIndex === 1 ? "line1DcaBase" : "line2DcaBase") as ModDestination,
												},
												{
													label: "Oct",
													value: octave,
													min: -2,
													max: 2,
													step: 1,
													color: "#7f9de4",
													fmt: (v: number) =>
														`${v >= 0 ? "+" : ""}${Math.round(v)}`,
													onChange: (v: number) => setOctave(Math.round(v)),
													modDest: (lineIndex === 1 ? "line1Octave" : "line2Octave") as ModDestination,
												},
												{
													label: "Fine",
													value: fineDetune,
													min: -50,
													max: 50,
													step: 1,
													color: "#9cb937",
													fmt: (v: number) =>
														`${v >= 0 ? "+" : ""}${Math.round(v)}`,
													onChange: (v: number) => setFineDetune(Math.round(v)),
													modDest: (lineIndex === 1 ? "line1Detune" : "line2Detune") as ModDestination,
												},
												{
													label: "DCO Rng",
													value: dcoDepth,
													min: 0,
													max: 24,
													step: 1,
													color: "#9cb937",
													fmt: (v: number) => `${Math.round(v)} st`,
													onChange: (v: number) => setDcoDepth(Math.round(v)),
													modDest: (lineIndex === 1 ? "line1DcoDepth" : "line2DcoDepth") as ModDestination,
												},
											] as const
										).map(
											({
												label,
												value,
												min,
												max,
												step,
												color: c,
												fmt,
												onChange,
												modDest,
											}) => (
												<div
													key={label}
													className="min-h-0 h-full flex flex-col items-center gap-1.5"
												>
													<span className="text-4xs uppercase tracking-[0.18em] text-cz-cream whitespace-nowrap">
														{fmt(value)}
													</span>
													<div className="flex-1 min-h-0 w-7.5">
														<CzVerticalSlider
															value={value}
															min={min}
															max={max}
															step={step}
															color={c}
															onChange={onChange}
															modDestination={modDest}
														/>
													</div>
												</div>
											),
										)}
									</div>
								</Card>

								<Card
									variant="subtle"
									className="p-3 min-h-0 flex flex-col col-span-2"
								>
									<div className="mb-3 text-3xs uppercase tracking-[0.24em] text-cz-cream">
										Algo Controls
									</div>
									{algoDefinitionControls.length > 0 ? (
										<div className="flex-1 min-h-0 space-y-3 overflow-visible">
											{algoDefinitionControls.map((control) => {
												const controlKind = control.kind ?? "number";
												const binding = controlBindings[control.id];
												if (controlKind === "select") {
													const options = control.options ?? [];
													const activeOption = getActiveSelectOption(control);
													return (
														<div key={control.id} className="space-y-1.5">
															<div className="flex items-center justify-between gap-2 text-4xs uppercase tracking-[0.18em] text-cz-cream">
																<span>{control.label}</span>
																<AlgoControlTooltip
																	description={control.description}
																/>
															</div>
															<div className="grid grid-cols-4 gap-1">
																{options.map((option, index) => (
																	<button
																		key={option.value}
																		type="button"
																		onClick={() => {
																			if (option.set.length > 0) {
																				applyOptionAssignments(option);
																				return;
																			}
																			binding?.setNumber?.(index);
																		}}
																		className={[
																			"px-2 py-1 text-4xs uppercase tracking-[0.18em] border transition-colors focus:outline-none",
																			activeOption?.value === option.value
																				? "border-cz-light-blue bg-cz-inset text-white"
																				: "border-cz-border bg-cz-surface text-cz-cream hover:border-cz-light-blue hover:text-white",
																		].join(" ")}
																	>
																		{option.label}
																	</button>
																))}
															</div>
														</div>
													);
												}

												if (controlKind === "number") {
													const min = control.min ?? 0;
													const max = control.max ?? 1;
													const value =
														binding?.getNumber?.() ??
														getAlgoControlValue(
															control.id,
															control.default ?? min,
														);
													return (
														<div key={control.id} className="space-y-1.5">
															<div className="flex items-center justify-between gap-2 text-4xs uppercase tracking-[0.18em] text-cz-cream">
																<div className="flex items-center gap-2">
																	<span>{control.label}</span>
																	<AlgoControlTooltip
																		description={control.description}
																	/>
																</div>
																<span>{value.toFixed(2)}</span>
															</div>
															<CzHorizontalSlider
																min={min}
																max={max}
																step={0.01}
																value={value}
																onChange={(newVal) =>
																	binding?.setNumber
																		? binding.setNumber(newVal)
																		: setAlgoControlValue(control.id, newVal)
																}
															/>
														</div>
													);
												}

												const toggleValue =
													binding?.getToggle?.() ??
													control.defaultToggle ??
													false;
												return (
													<div
														key={control.id}
														className="flex items-center justify-between rounded-md bg-cz-inset/70 px-2 py-1.5"
													>
														<div className="flex items-center gap-2">
															<span className="text-4xs uppercase tracking-[0.18em] text-cz-cream">
																{control.label}
															</span>
															<AlgoControlTooltip
																description={control.description}
															/>
														</div>
														<input
															type="checkbox"
															checked={toggleValue}
															onChange={(event) =>
																binding?.setToggle?.(event.target.checked)
															}
															disabled={!binding?.setToggle}
															className="checkbox checkbox-xs"
														/>
													</div>
												);
											})}
										</div>
									) : (
										<div className="text-3xs text-cz-cream/70 uppercase tracking-[0.2em]">
											No controls for this algo
										</div>
									)}
								</Card>
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
