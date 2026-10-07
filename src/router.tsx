import { createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

export function getRouter() {
  return createRouter({
    routeTree,
    basepath: import.meta.env.VITE_BASE_PATH || '/MiauDelier_Manager/',
  })
}
