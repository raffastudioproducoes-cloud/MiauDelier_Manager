import { createRootRoute, Outlet, useRouterState } from '@tanstack/react-router'
import { RequireAuth } from '../features/auth/RequireAuth'
import { AppShell } from '../components/layout/AppShell'
import { ToastProvider } from '../components/ui/ToastProvider'

export const Route = createRootRoute({
  component: RootComponent,
})

function RootComponent() {
  const { location } = useRouterState()
  const conteudo = <Outlet />

  // ToastProvider por fora do guard: erro de rede/senha na tela de login também precisa de toast.
  return (
    <ToastProvider>
      <RequireAuth>
        {location.pathname === '/login' ? conteudo : <AppShell>{conteudo}</AppShell>}
      </RequireAuth>
    </ToastProvider>
  )
}
