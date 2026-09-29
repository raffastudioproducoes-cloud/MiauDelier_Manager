/* eslint-disable react-refresh/only-export-components */
import { createFileRoute } from '@tanstack/react-router'
import { DiagnosticoPage } from '../features/analytics/DiagnosticoPage'
import { RequireAuth } from '../features/auth/RequireAuth'

export const Route = createFileRoute('/diagnostico')({
  component: DiagnosticoRoute,
})

function DiagnosticoRoute() {
  return (
    <RequireAuth>
      <DiagnosticoPage />
    </RequireAuth>
  )
}
