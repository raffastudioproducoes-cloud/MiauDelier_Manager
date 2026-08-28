import { createFileRoute } from '@tanstack/react-router'
import { ContasPage } from '../features/financeiro/ContasPage'

export const Route = createFileRoute('/contas')({
  component: ContasPage,
})
