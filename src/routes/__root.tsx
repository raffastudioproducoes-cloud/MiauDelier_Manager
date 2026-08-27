import { createRootRoute, Outlet } from '@tanstack/react-router'
import { RequireAuth } from '../features/auth/RequireAuth'

export const Route = createRootRoute({
  component: () => (
    <RequireAuth>
      <Outlet />
    </RequireAuth>
  ),
})
