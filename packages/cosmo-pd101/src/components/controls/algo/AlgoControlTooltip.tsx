import { useHoverInfoHandlers } from "../../layout/HoverInfo";

export default function AlgoControlTooltip({
	description,
}: {
	description?: string | null;
}) {
	const hoverHandlers = useHoverInfoHandlers(description);

	if (!description) {
		return null;
	}

	return (
		<button
			type="button"
			className="btn btn-ghost btn-circle btn-xs h-4 min-h-4 w-4 border border-cz-border p-0 text-2xs font-semibold leading-none text-cz-cream/70 hover:border-cz-light-blue hover:text-cz-light-blue"
			aria-label="Show control description"
			data-hover-info={description}
			{...hoverHandlers}
		>
			?
		</button>
	);
}
