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

// Sync quando o app volta do background ou reconecta à internet
window.addEventListener('online', () => {
  console.log('[App] Online detectado — sincronizando...')
  syncWithSupabase()
})
window.addEventListener('focus', () => {
  // Debounce: só sincroniza se passou mais de 2 min desde o último sync
  syncWithSupabase()
})
window.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    syncWithSupabase()
  }
})
window.addEventListener('beforeunload', () => {
  syncWithSupabase()
})

import { registerSW } from 'virtual:pwa-register'
registerSW({
  immediate: true,
  onRegisteredSW(_url, registration) {
    if (!registration) return

    void registration.update()
    window.setInterval(() => void registration.update(), 60 * 60 * 1000)
  },
})

const router = getRouter()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <RouterProvider router={router} />
    </ErrorBoundary>
  </StrictMode>,
)

window.requestAnimationFrame(() => {
  const splash = document.getElementById('pwa-splash')
  if (!splash) return
  splash.classList.add('is-ready')
  window.setTimeout(() => splash.remove(), 180)
})
