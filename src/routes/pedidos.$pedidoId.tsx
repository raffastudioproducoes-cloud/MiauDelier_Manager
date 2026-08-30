import { createFileRoute } from '@tanstack/react-router'
import { PedidoDetalhePage } from '../features/vendas/PedidoDetalhePage'

export const Route = createFileRoute('/pedidos/$pedidoId')({
  component: PedidoDetalhePage,
})
