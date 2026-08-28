import { createFileRoute } from '@tanstack/react-router'
import { BackupPage } from '../features/configuracoes/BackupPage'

export const Route = createFileRoute('/backup')({
  component: BackupPage,
})
