import { createFileRoute } from '@tanstack/react-router'
import { MateriaisPage } from '../features/producao/MateriaisPage'

export const Route = createFileRoute('/materiais')({
  component: MateriaisPage,
})
