import { createFileRoute } from '@tanstack/react-router'
import { AssistenteIAPage } from '../features/assistente/AssistenteIAPage'

export const Route = createFileRoute('/assistente')({
  component: AssistenteIAPage,
})
