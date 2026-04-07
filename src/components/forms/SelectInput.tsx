import type { SelectHTMLAttributes } from "react";

interface SelectInputProps extends SelectHTMLAttributes<HTMLSelectElement> {
	selectSize?: "sm" | "md" | "lg";
}

export default function SelectInput({
	selectSize = "md",
	className = "",
	children,
	...props
}: SelectInputProps) {
	return (
		<select
			className={`select select-bordered select-${selectSize} w-full ${className}`.trim()}
			{...props}
		>
			{children}
		</select>
	);
}
