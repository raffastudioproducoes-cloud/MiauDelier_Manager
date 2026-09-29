/* eslint-disable react-refresh/only-export-components */
import { createFileRoute } from '@tanstack/react-router'
import { TaxasPage } from '../features/vendas/TaxasPage'
import { RequireAuth } from '../features/auth/RequireAuth'

export const Route = createFileRoute('/taxas')({
  component: TaxasRoute,
})

function TaxasRoute() {
  return (
    <RequireAuth>
      <TaxasPage />
    </RequireAuth>
  )
}
