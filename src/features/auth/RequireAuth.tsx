import { useEffect, type ReactNode } from 'react'
import { useNavigate, useRouterState } from '@tanstack/react-router'
import { useAuthStore } from '../../stores/authStore'

export function RequireAuth({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const autenticado = useAuthStore((estado) => estado.autenticado)
  const contaConfigurada = useAuthStore((estado) => estado.contaConfigurada)
  const carregarEstadoInicial = useAuthStore((estado) => estado.carregarEstadoInicial)
  const { location } = useRouterState()

  useEffect(() => {
    if (contaConfigurada === null) {
      carregarEstadoInicial()
    }
  }, [contaConfigurada, carregarEstadoInicial])

  useEffect(() => {
    if (contaConfigurada !== null && !autenticado && location.pathname !== '/login') {
      navigate({ to: '/login' })
    }
  }, [autenticado, contaConfigurada, location.pathname, navigate])

  // Não montar os filhos enquanto o estado inicial ou redirecionamento não acontece
  if (contaConfigurada === null) return null
  if (!autenticado && location.pathname !== '/login') return null

  return <>{children}</>
}
