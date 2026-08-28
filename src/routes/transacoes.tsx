import { createFileRoute } from '@tanstack/react-router'
import { TransacoesPage } from '../features/financeiro/TransacoesPage'

export const Route = createFileRoute('/transacoes')({
  component: TransacoesPage,
})
