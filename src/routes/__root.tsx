/* eslint-disable react-refresh/only-export-components */
/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from 'react'
import { createRootRoute, Outlet, useRouterState } from '@tanstack/react-router'
import { RequireAuth } from '../features/auth/RequireAuth'
import { AppShell } from '../components/layout/AppShell'
import { ToastProvider } from '../components/ui/ToastProvider'
import { CheckCircle2 } from 'lucide-react'

export const Route = createRootRoute({
  component: RootComponent,
})

function RootComponent() {
  const { location } = useRouterState()
  const conteudo = <Outlet />
  const [mensagemHash, setMensagemHash] = useState<string | null>(null)

  useEffect(() => {
    // Intercepta o redirecionamento do Supabase (magic link ou confirmação de email)
    const hash = window.location.hash
    if (hash.includes('access_token=')) {
      if (hash.includes('type=signup')) {
        setMensagemHash('E-mail confirmado com sucesso!')
      } else if (hash.includes('type=recovery')) {
        setMensagemHash('Recuperação de senha autorizada!')
      } else {
        setMensagemHash('Autenticação concluída!')
      }
      
      // Fecha a aba após 5 segundos
      setTimeout(() => {
        window.close()
      }, 5000)
    }
  }, [])

  if (mensagemHash) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-on-surface p-4">
        <div className="flex flex-col items-center justify-center p-8 rounded-3xl bg-surface-container-high border border-outline-variant shadow-xl text-center space-y-4 max-w-sm">
          <CheckCircle2 className="w-16 h-16 text-primary animate-bounce" />
          <h1 className="text-2xl font-extrabold tracking-tight text-on-surface">Tudo certo!</h1>
          <p className="text-sm font-medium text-on-surface-variant">
            {mensagemHash}
          </p>
          <p className="text-xs text-on-surface-variant/70 mt-4 animate-pulse">
            Esta aba será fechada automaticamente em 5 segundos...
          </p>
          <button 
            onClick={() => window.close()} 
            className="mt-6 px-6 py-2 bg-primary text-on-primary text-sm font-bold rounded-xl glow-hover"
          >
            Fechar agora
          </button>
        </div>
      </div>
    )
  }

  // ToastProvider por fora do guard: erro de rede/senha na tela de login também precisa de toast.
  return (
    <ToastProvider>
      <RequireAuth>
        {location.pathname === '/login' ? conteudo : <AppShell>{conteudo}</AppShell>}
      </RequireAuth>
    </ToastProvider>
  )
}
