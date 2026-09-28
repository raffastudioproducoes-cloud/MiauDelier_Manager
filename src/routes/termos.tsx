import { createFileRoute } from '@tanstack/react-router'
import { TermosUsoPage } from '../features/legais/TermosUsoPage'

export const Route = createFileRoute('/termos')({
  component: TermosUsoPage,
})
