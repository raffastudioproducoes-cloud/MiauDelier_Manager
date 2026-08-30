import { createContext, useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '../../lib/cn'

interface Toast {
  id: number
  mensagem: string
  tipo: 'sucesso' | 'erro'
}

export interface ToastContextValue {
  mostrarToast: (mensagem: string, tipo?: Toast['tipo']) => void
}

export const ToastContext = createContext<ToastContextValue | null>(null)

const DURACAO_TOAST_MS = 4000

export function ToastProvider({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timeoutsRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set())

  useEffect(() => {
    const timeouts = timeoutsRef.current
    return () => {
      timeouts.forEach((timeoutId) => clearTimeout(timeoutId))
      timeouts.clear()
    }
  }, [])

  const mostrarToast = useCallback((mensagem: string, tipo: Toast['tipo'] = 'sucesso') => {
    const id = Date.now()
    setToasts((atual) => [...atual, { id, mensagem, tipo }])
    const timeoutId = setTimeout(() => {
      timeoutsRef.current.delete(timeoutId)
      setToasts((atual) => atual.filter((t) => t.id !== id))
    }, DURACAO_TOAST_MS)
    timeoutsRef.current.add(timeoutId)
  }, [])

  return (
    <ToastContext.Provider value={{ mostrarToast }}>
      {children}
      <div className={cn('fixed bottom-4 right-4 flex flex-col gap-2', className)}>
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className={cn(
              'rounded-lg px-4 py-2 elevation-raised',
              toast.tipo === 'erro' && 'text-[var(--color-danger)]',
            )}
          >
            {toast.mensagem}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
