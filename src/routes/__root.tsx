import { createRootRoute, Outlet, useRouterState } from '@tanstack/react-router'
import { RequireAuth } from '../features/auth/RequireAuth'
import { AppShell } from '../components/layout/AppShell'

export const Route = createRootRoute({
  component: RootComponent,
})

function RootComponent() {
  const { location } = useRouterState()
  const conteudo = <Outlet />

  return (
    <RequireAuth>
      {location.pathname === '/login' ? conteudo : <AppShell>{conteudo}</AppShell>}
    </RequireAuth>
  )
}
