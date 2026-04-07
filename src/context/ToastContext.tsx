import React, { createContext, useCallback, useContext, useState } from 'react'

type ToastType = 'success' | 'info' | 'error' | 'warning'

interface ToastItem {
  id: number
  message: string
  type: ToastType
}

interface ToastContextValue {
  notifySuccess: (message: string) => void
  notifyInfo: (message: string) => void
  notifyError: (message: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

let nextToastId = 0

const typeClass: Record<ToastType, string> = {
  success: 'alert-success',
  info: 'alert-info',
  error: 'alert-error',
  warning: 'alert-warning',
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const add = useCallback((message: string, type: ToastType) => {
    const id = ++nextToastId
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }, [])

  const notifySuccess = useCallback((msg: string) => add(msg, 'success'), [add])
  const notifyInfo = useCallback((msg: string) => add(msg, 'info'), [add])
  const notifyError = useCallback((msg: string) => add(msg, 'error'), [add])

  return (
    <ToastContext.Provider value={{ notifySuccess, notifyInfo, notifyError }}>
      {children}
      {toasts.length > 0 && (
        <div className="toast toast-end toast-bottom z-50">
          {toasts.map((t) => (
            <div key={t.id} className={`alert ${typeClass[t.type]} shadow-lg text-sm`}>
              <span>{t.message}</span>
            </div>
          ))}
        </div>
      )}
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
