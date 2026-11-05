import { useSyncExternalStore } from 'react'

function inscrever(notificar: () => void) {
  window.addEventListener('online', notificar)
  window.addEventListener('offline', notificar)
  return () => {
    window.removeEventListener('online', notificar)
    window.removeEventListener('offline', notificar)
  }
}

export function useConexaoEstoque() {
  return useSyncExternalStore(inscrever, () => navigator.onLine, () => true)
}
