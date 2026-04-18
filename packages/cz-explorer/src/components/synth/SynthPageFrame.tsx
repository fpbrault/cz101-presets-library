import type { CSSProperties, ReactNode } from "react";
import SynthHeader, { type SynthHeaderProps } from "./SynthHeader";

type SynthPageFrameProps = {
	headerProps: SynthHeaderProps;
	children: ReactNode;
	className?: string;
	style?: CSSProperties;
	headerExtra?: ReactNode;
};

export default function SynthPageFrame({
	headerProps,
	children,
	className,
	style,
	headerExtra,
}: SynthPageFrameProps) {
	return (
		<div className={className} style={style}>
			<SynthHeader {...headerProps} />
			{headerExtra}
			{children}
		</div>
	);
}
