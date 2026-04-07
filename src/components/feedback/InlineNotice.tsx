import type React from "react";

type InlineNoticeTone = "info" | "success" | "warning" | "error" | "neutral";

interface InlineNoticeProps {
	message: React.ReactNode;
	tone?: InlineNoticeTone;
	size?: "sm" | "md";
	className?: string;
}

const toneClasses: Record<InlineNoticeTone, string> = {
	info: "alert-info",
	success: "alert-success",
	warning: "alert-warning",
	error: "alert-error",
	neutral: "alert-neutral",
};

const sizeClasses: Record<NonNullable<InlineNoticeProps["size"]>, string> = {
	sm: "text-xs py-2",
	md: "text-sm py-3",
};

const InlineNotice: React.FC<InlineNoticeProps> = ({
	message,
	tone = "info",
	size = "sm",
	className = "",
}) => {
	return (
		<div
			role="status"
			className={`alert ${toneClasses[tone]} ${sizeClasses[size]} ${className}`}
		>
			<span>{message}</span>
		</div>
	);
};

export default InlineNotice;
