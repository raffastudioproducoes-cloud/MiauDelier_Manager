import { createFileRoute } from '@tanstack/react-router'
import { ClientesPage } from '../features/vendas/ClientesPage'

export const Route = createFileRoute('/clientes')({
  component: ClientesPage,
})
