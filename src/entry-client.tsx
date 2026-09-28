import './styles/globals.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from '@tanstack/react-router'
import { getRouter } from './router'
import { inicializarLoggerGlobal } from './lib/logger'
import { ErrorBoundary } from './components/ErrorBoundary'

// Inicializa a captura global de falhas e eventos do sistema
inicializarLoggerGlobal()

const router = getRouter()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <RouterProvider router={router} />
    </ErrorBoundary>
  </StrictMode>,
)
