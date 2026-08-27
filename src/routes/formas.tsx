import { createFileRoute } from '@tanstack/react-router'
import { FormasPage } from '../features/producao/FormasPage'

export const Route = createFileRoute('/formas')({
  component: FormasPage,
})
