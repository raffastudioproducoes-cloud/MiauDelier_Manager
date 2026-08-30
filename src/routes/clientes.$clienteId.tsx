import { createFileRoute } from '@tanstack/react-router'
import { ClienteDetalhePage } from '../features/vendas/ClienteDetalhePage'

export const Route = createFileRoute('/clientes/$clienteId')({
  component: ClienteDetalhePage,
})
