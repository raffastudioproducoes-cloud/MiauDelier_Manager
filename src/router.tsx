import { createRouter } from '@tanstack/react-router'
import { Route as RootRoute } from './routes/__root'
import { Route as IndexRoute } from './routes/index'
import { Route as LoginRoute } from './routes/login'

const routeTree = RootRoute.addChildren([IndexRoute, LoginRoute])

export function getRouter() {
  return createRouter({ routeTree })
}
