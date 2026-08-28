import { createFileRoute } from '@tanstack/react-router'
import { ConfiguracoesPage } from '../features/ia/ConfiguracoesPage'

export const Route = createFileRoute('/configuracoes')({
  component: ConfiguracoesPage,
})
