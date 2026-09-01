import { createFileRoute } from '@tanstack/react-router'
import { MaisPage } from '../features/mais/MaisPage'

export const Route = createFileRoute('/mais')({
  component: MaisPage,
})
