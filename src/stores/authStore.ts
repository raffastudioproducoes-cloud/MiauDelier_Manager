import { create } from 'zustand'
import { hasAccountConfigured, setupAccount, login, clearSession, recuperarCofreComNuvem, alterarSenha as dbAlterarSenha } from '../lib/auth'
import { prepareLocalCacheForUser, syncOnLogin } from '../lib/syncService'
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
    if (!cloudSession?.user) {
      clearSession()
      set({ contaConfigurada: false, autenticado: false })
      return
    }

    // O Supabase e a fonte de verdade da sessão. IndexedDB é apenas cache por usuário.
    await prepareLocalCacheForUser(cloudSession.user.id)
    if (!await hasAccountConfigured()) await setupAccount('')
    await syncOnLogin().catch(console.warn)
    set({ contaConfigurada: true, autenticado: true })
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
    // A conta Supabase pode voltar a autenticar no mesmo dispositivo após logout.
    // Nesse caso, o marcador local já existe e só precisamos restaurar a sessão.
    if (await hasAccountConfigured()) {
      await login(senha)
    } else {
      await setupAccount(senha)
    }
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
