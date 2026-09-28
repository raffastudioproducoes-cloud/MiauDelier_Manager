import { createFileRoute } from '@tanstack/react-router'
import { PerfilPage } from '../features/perfil/PerfilPage'

export const Route = createFileRoute('/perfil')({
  component: PerfilPage,
})
