import type React from "react";
import {
	type CardPadding,
	type CardVariant,
	getCardClassName,
	joinClasses,
} from "./Card";

type CommonProps = {
	variant?: CardVariant;
	padding?: CardPadding;
	title: React.ReactNode;
	children: React.ReactNode;
	className?: string;
	titleClassName?: string;
	contentClassName?: string;
	arrow?: boolean;
};

type DetailsModeProps = CommonProps &
	Omit<
		React.DetailedHTMLProps<
			React.DetailsHTMLAttributes<HTMLDetailsElement>,
			HTMLDetailsElement
		>,
		"children" | "className" | "title"
	> & {
		mode?: "details";
	};

type CheckboxModeProps = CommonProps & {
	mode: "checkbox";
	defaultOpen?: boolean;
	inputClassName?: string;
};

type CollapsibleCardProps = DetailsModeProps | CheckboxModeProps;

const COLLAPSE_BASE_CLASSES =
	"border border-base-300/70 text-base-content outline-none";

export default function CollapsibleCard(props: CollapsibleCardProps) {
	const {
		variant = "subtle",
		padding = "none",
		title,
		children,
		className = "",
		titleClassName = "",
		contentClassName = "",
		arrow = true,
	} = props;

	const collapseClassName = getCardClassName({
		variant,
		padding,
		className: joinClasses(
			"collapse overflow-hidden",
			arrow && "collapse-arrow",
			className,
		),
		baseClassName: COLLAPSE_BASE_CLASSES,
	});

	if (props.mode === "checkbox") {
		const { defaultOpen = false, inputClassName = "" } = props;

		return (
			<div className={collapseClassName}>
				<input
					type="checkbox"
					defaultChecked={defaultOpen}
					className={inputClassName}
				/>
				<div className={joinClasses("collapse-title", titleClassName)}>
					{title}
				</div>
				<div className={joinClasses("collapse-content", contentClassName)}>
					{children}
				</div>
			</div>
		);
	}

	const {
		mode: _mode,
		variant: _variant,
		padding: _padding,
		title: _title,
		children: _children,
		className: _className,
		titleClassName: _titleClassName,
		contentClassName: _contentClassName,
		arrow: _arrow,
		...detailsProps
	} = props;

	return (
		<details className={collapseClassName} {...detailsProps}>
			<summary
				className={joinClasses(
					"collapse-title cursor-pointer list-none",
					titleClassName,
				)}
			>
				{title}
			</summary>
			<div className={joinClasses("collapse-content", contentClassName)}>
				{children}
			</div>
		</details>
	);
}
