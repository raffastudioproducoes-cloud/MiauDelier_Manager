import { createFileRoute } from '@tanstack/react-router'
import { LogsPage } from '../features/configuracoes/LogsPage'

export const Route = createFileRoute('/logs')({
  component: LogsPage,
})
