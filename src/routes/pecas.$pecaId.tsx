import { createFileRoute } from '@tanstack/react-router'
import { PecaDetalhePage } from '../features/producao/PecaDetalhePage'

export const Route = createFileRoute('/pecas/$pecaId')({
  component: PecaDetalhePage,
})
