import type React from "react";
import type { ReactNode } from "react";

interface KeyValueBlockProps {
	label: string;
	value: ReactNode;
	className?: string;
}

const KeyValueBlock: React.FC<KeyValueBlockProps> = ({
	label,
	value,
	className = "",
}) => {
	return (
		<div className={className}>
			<div className="text-[10px] uppercase tracking-wider text-base-content/40">
				{label}
			</div>
			<div className="mt-1 text-xs font-mono font-semibold break-all">
				{value}
			</div>
		</div>
	);
};

export default KeyValueBlock;
