import { createFileRoute } from '@tanstack/react-router'
import { AuditoriaPage } from '../features/auditoria/AuditoriaPage'

export const Route = createFileRoute('/auditoria')({
  component: AuditoriaPage,
})
