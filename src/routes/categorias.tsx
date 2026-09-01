import { createFileRoute } from '@tanstack/react-router'
import { CategoriasMaterialPage } from '../features/producao/CategoriasMaterialPage'

export const Route = createFileRoute('/categorias')({
  component: CategoriasMaterialPage,
})
