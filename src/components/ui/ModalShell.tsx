import { ReactNode } from 'react'

interface ModalShellProps {
  children: ReactNode
  panelClassName?: string
  onClose?: () => void
}

export default function ModalShell({
  children,
  panelClassName = 'w-full max-w-2xl',
  onClose,
}: ModalShellProps) {
  return (
    <dialog open className="modal modal-open">
      <div className={`modal-box ${panelClassName}`}>{children}</div>
      {onClose && (
        <form method="dialog" className="modal-backdrop">
          <button onClick={onClose}>close</button>
        </form>
      )}
    </dialog>
  )
}