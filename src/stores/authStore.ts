import { create } from 'zustand'
import { hasAccountConfigured, hasLocalCacheForUser, setupAccount, login, clearSession, restoreSessionKey, recuperarCofreComNuvem, alterarSenha as dbAlterarSenha } from '../lib/auth'
import { syncOnLogin } from '../lib/syncService'
import { supabase } from '../lib/supabase'

interface AuthState {
  autenticado: boolean
  contaConfigurada: boolean | null
  carregarEstadoInicial: () => Promise<void>
  entrar: (senha: string) => Promise<boolean>
  criarConta: (senha: string) => Promise<void>
  recuperarConta: (novaSenha: string) => Promise<boolean>
  alterarSenha: (novaSenha: string) => Promise<void>
  sair: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  autenticado: false,
  contaConfigurada: null,

  carregarEstadoInicial: async () => {
    const { data: { session: cloudSession } } = await supabase.auth.getSession()
    const existe = await hasAccountConfigured()
    if (!existe || !cloudSession?.user || !await hasLocalCacheForUser(cloudSession.user.id)) {
      clearSession()
      set({ contaConfigurada: false, autenticado: false })
      return
    }

    const chaveRestaurada = await restoreSessionKey()
    set({
      contaConfigurada: true,
      autenticado: chaveRestaurada !== null,
    })

    // Se restaurou sessão, faz sync imediato em background
    if (chaveRestaurada) {
      syncOnLogin().catch(console.warn)
    }
  },

  entrar: async (senha: string) => {
    const chave = await login(senha)
    if (!chave) return false
    // Sync agressivo pós-login — baixa todos os dados necessários antes de liberar a tela
    await syncOnLogin().catch(console.warn)
    set({ autenticado: true })
    return true
  },

  criarConta: async (senha: string) => {
    await setupAccount(senha)
    set({ autenticado: true, contaConfigurada: true })
  },

  recuperarConta: async (novaSenha: string) => {
    const chave = await recuperarCofreComNuvem(novaSenha)
    if (!chave) return false
    // Sync agressivo pós-recuperação — baixa todos os dados antes de liberar a tela
    await syncOnLogin().catch(console.warn)
    set({ autenticado: true })
    return true
  },

  alterarSenha: async (novaSenha: string) => {
    await dbAlterarSenha(novaSenha)
  },

  sair: () => {
    clearSession()
    set({ autenticado: false })
  },
}))
