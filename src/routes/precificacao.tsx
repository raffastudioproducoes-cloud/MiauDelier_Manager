import { createFileRoute } from '@tanstack/react-router'
import { PrecificacaoPage } from '../features/vendas/PrecificacaoPage'

export const Route = createFileRoute('/precificacao')({
  component: PrecificacaoPage,
})
