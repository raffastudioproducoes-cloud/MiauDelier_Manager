import { createFileRoute } from '@tanstack/react-router'
import { PecasPage } from '../features/producao/PecasPage'

export const Route = createFileRoute('/pecas')({
  component: PecasPage,
})
