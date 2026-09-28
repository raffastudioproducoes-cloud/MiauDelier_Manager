import { createFileRoute } from '@tanstack/react-router'
import { PoliticaPrivacidadePage } from '../features/legais/PoliticaPrivacidadePage'

export const Route = createFileRoute('/privacidade')({
  component: PoliticaPrivacidadePage,
})
