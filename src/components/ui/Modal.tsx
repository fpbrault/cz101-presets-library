import type { ReactNode } from "react";
import Button from "@/components/ui/Button";

interface ModalProps {
	children: ReactNode;
	panelClassName?: string;
	onClose?: () => void;
}

export default function Modal({
	children,
	panelClassName = "w-full max-w-2xl",
	onClose,
}: ModalProps) {
	return (
		<dialog open className="modal modal-open">
			<div className={`modal-box ${panelClassName}`}>{children}</div>
			{onClose && (
				<form method="dialog" className="modal-backdrop">
					<Button type="button" onClick={onClose} unstyled>
						close
					</Button>
				</form>
			)}
		</dialog>
	);
}
