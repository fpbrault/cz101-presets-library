import type React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	variant?:
		| "primary"
		| "secondary"
		| "accent"
		| "error"
		| "info"
		| "success"
		| "neutral";
	size?: "sm" | "md" | "lg" | "xl";
	unstyled?: boolean;
	className?: string;
}

const Button: React.FC<ButtonProps> = ({
	children,
	variant = "primary",
	size = "md",
	unstyled = false,
	className = "",
	...props
}) => {
	const classes = unstyled
		? className
		: `btn btn-${variant} btn-${size} ${className}`.trim();
	return (
		<button className={classes} {...props}>
			{children}
		</button>
	);
};

export default Button;
