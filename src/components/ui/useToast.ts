import { useContext } from 'react'
import { ToastContext, type ToastContextValue } from './ToastProvider'

export function useToast(): ToastContextValue {
  const contexto = useContext(ToastContext)
  if (!contexto) throw new Error('useToast precisa estar dentro de um ToastProvider')
  return contexto
}
