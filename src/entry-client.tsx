import './styles/globals.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from '@tanstack/react-router'
import { getRouter } from './router'
import { inicializarLoggerGlobal } from './lib/logger'
import { ErrorBoundary } from './components/ErrorBoundary'
import { registerDexieHooks, syncWithSupabase } from './lib/syncService'

// Inicializa a captura global de falhas e eventos do sistema
inicializarLoggerGlobal()

// Inicia o motor de sincronização Event Sourcing (Supabase <-> Dexie)
registerDexieHooks()
// Sincroniza a cada 5 minutos (300.000 ms) para não sobrecarregar
setInterval(syncWithSupabase, 300_000)
window.addEventListener('online', syncWithSupabase)
window.addEventListener('focus', syncWithSupabase)

import { registerSW } from 'virtual:pwa-register'
registerSW({ immediate: true })

const router = getRouter()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <RouterProvider router={router} />
    </ErrorBoundary>
  </StrictMode>,
)
