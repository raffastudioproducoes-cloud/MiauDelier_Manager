import { useEffect, type ReactNode } from 'react'
import { useNavigate, useRouterState } from '@tanstack/react-router'
import { useAuthStore } from '../../stores/authStore'

export function RequireAuth({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const autenticado = useAuthStore((estado) => estado.autenticado)
  const { location } = useRouterState()

  useEffect(() => {
    if (!autenticado && location.pathname !== '/login') {
      navigate({ to: '/login' })
    }
  }, [autenticado, location.pathname, navigate])

  return <>{children}</>
}
