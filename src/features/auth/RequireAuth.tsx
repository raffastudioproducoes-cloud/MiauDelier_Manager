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

  // Não montar os filhos enquanto o redirecionamento não acontece: sem sessão, uma tela protegida
  // que lê o repositório no mount dispararia SessaoFechadaError antes de o navigate completar.
  if (!autenticado && location.pathname !== '/login') return null

  return <>{children}</>
}
