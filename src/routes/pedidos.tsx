import { createFileRoute } from '@tanstack/react-router'
import { PedidosPage } from '../features/vendas/PedidosPage'

export const Route = createFileRoute('/pedidos')({
  component: PedidosPage,
})
