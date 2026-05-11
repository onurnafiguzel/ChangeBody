import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import '../../styles/toast.css'

export type ToastVariant = 'success' | 'error' | 'info' | 'warning'

interface ToastItem {
  id: number
  variant: ToastVariant
  message: string
}

interface ToastContextValue {
  show: (variant: ToastVariant, message: string, durationMs?: number) => void
  success: (message: string, durationMs?: number) => void
  error: (message: string, durationMs?: number) => void
  info: (message: string, durationMs?: number) => void
  warning: (message: string, durationMs?: number) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const DEFAULT_DURATION = 4000

const VARIANT_ICON: Record<ToastVariant, string> = {
  success: '✓',
  error: '⚠️',
  warning: '⚠',
  info: 'ℹ',
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const show = useCallback(
    (variant: ToastVariant, message: string, durationMs: number = DEFAULT_DURATION) => {
      const id = Date.now() + Math.random()
      setToasts((prev) => [...prev, { id, variant, message }])
      if (durationMs > 0) {
        setTimeout(() => dismiss(id), durationMs)
      }
    },
    [dismiss],
  )

  const value: ToastContextValue = {
    show,
    success: (m, d) => show('success', m, d),
    error: (m, d) => show('error', m, d),
    info: (m, d) => show('info', m, d),
    warning: (m, d) => show('warning', m, d),
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack" role="region" aria-live="polite" aria-label="Bildirimler">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.variant}`} role="status">
            <span className="toast-icon" aria-hidden="true">{VARIANT_ICON[t.variant]}</span>
            <span className="toast-message">{t.message}</span>
            <button
              type="button"
              className="toast-close"
              onClick={() => dismiss(t.id)}
              aria-label="Bildirimi kapat"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>')
  return ctx
}
