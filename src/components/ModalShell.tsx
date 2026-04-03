import { ReactNode } from 'react'

interface ModalShellProps {
  children: ReactNode
  panelClassName?: string
}

export default function ModalShell({
  children,
  panelClassName = 'w-full max-w-2xl p-4 shadow-2xl bg-base-100 rounded-xl',
}: ModalShellProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className={panelClassName}>{children}</div>
    </div>
  )
}