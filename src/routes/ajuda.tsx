import { createFileRoute } from '@tanstack/react-router'
import { AjudaSuportePage } from '../features/ajuda/AjudaSuportePage'

export const Route = createFileRoute('/ajuda')({
  component: AjudaSuportePage,
})
