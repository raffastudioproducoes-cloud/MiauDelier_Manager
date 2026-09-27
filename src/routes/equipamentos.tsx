import { createFileRoute } from '@tanstack/react-router'
import { EquipamentosPage } from '../features/producao/EquipamentosPage'
import { RequireAuth } from '../features/auth/RequireAuth'

export const Route = createFileRoute('/equipamentos')({
  component: EquipamentosRoute,
})

function EquipamentosRoute() {
  return (
    <RequireAuth>
      <EquipamentosPage />
    </RequireAuth>
  )
}
