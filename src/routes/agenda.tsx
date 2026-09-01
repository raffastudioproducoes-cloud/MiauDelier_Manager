import { createFileRoute } from '@tanstack/react-router'
import { AgendaPage } from '../features/agenda/AgendaPage'

export const Route = createFileRoute('/agenda')({
  component: AgendaPage,
})
