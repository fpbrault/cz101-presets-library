export default function AlgoControlTooltip({
	description,
}: {
	description?: string | null;
}) {
	if (!description) {
		return null;
	}

	return (
		<div
			className="tooltip tooltip-right z-50 [&:before]:bg-cz-body [&:before]:text-left [&:before]:text-xs normal-case [&:before]:leading-tight"
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
