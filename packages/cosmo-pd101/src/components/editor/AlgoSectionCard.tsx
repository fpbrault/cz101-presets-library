import AlgoControlsGroup from "@/components/controls/algo/AlgoControlsGroup";
import AlgoIconGrid from "@/components/controls/algo/AlgoIconGrid";
import type {
	AlgoControlBinding,
	AlgoControlOptionRuntime,
	AlgoControlRuntime,
	LineIndex,
} from "@/components/controls/algo/algoControlTypes";
import Card from "@/components/primitives/Card";
import type { PdAlgo } from "@/lib/synth/pdAlgorithms";

type AlgoSectionCardProps = {
	title: string;
	algoLabel?: string;
	value: PdAlgo;
	onChange: (value: PdAlgo) => void;
	disabled?: boolean;
	controls: AlgoControlRuntime[];
	controlBindings: Record<string, AlgoControlBinding>;
	lineIndex: LineIndex;
	algoParamSlotIndex: Record<string, number>;
	getAlgoControlValue: (id: string, fallback: number) => number;
	setAlgoControlValue: (id: string, value: number) => void;
	getActiveSelectOption: (
		control: AlgoControlRuntime,
	) => AlgoControlOptionRuntime | null;
	applyOptionAssignments: (option: AlgoControlOptionRuntime) => void;
};

export default function AlgoSectionCard({
	title,
	algoLabel,
	value,
	onChange,
	disabled = false,
	controls,
	controlBindings,
	lineIndex,
	algoParamSlotIndex,
	getAlgoControlValue,
	setAlgoControlValue,
	getActiveSelectOption,
	applyOptionAssignments,
}: AlgoSectionCardProps) {
	return (
		<Card
			variant="subtle"
			className={`min-h-0 flex flex-col ${disabled ? "opacity-45" : ""}`}
		>
			<div className="flex justify-between">
				<div className="mb-2 text-3xs uppercase tracking-[0.24em] text-cz-cream">
					{title}
				</div>
				<span className="text-3xs uppercase tracking-[0.2em] text-cz-light-blue font-bold">
					{algoLabel}
				</span>
			</div>
			<AlgoIconGrid
				value={value}
				onChange={onChange}
				size={36}
				disabled={disabled}
			/>
			<div className="mt-2 border-t border-cz-border/70 pt-4">
				<AlgoControlsGroup
					embedded
					title="Controls"
					disabled={disabled}
					controls={controls}
					controlBindings={controlBindings}
					lineIndex={lineIndex}
					algoParamSlotIndex={algoParamSlotIndex}
					getAlgoControlValue={getAlgoControlValue}
					setAlgoControlValue={setAlgoControlValue}
					getActiveSelectOption={getActiveSelectOption}
					applyOptionAssignments={applyOptionAssignments}
				/>
			</div>
		</Card>
	);
}
