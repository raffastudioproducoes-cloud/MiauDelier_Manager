import { create } from 'zustand'
import { hasAccountConfigured, setupAccount, login, clearSession, restoreSessionKey, recuperarCofreComNuvem, alterarSenha as dbAlterarSenha } from '../lib/auth'
import { syncOnLogin } from '../lib/syncService'

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
    const existe = await hasAccountConfigured()
    if (!existe) {
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
    set({ autenticado: true })
    // Sync agressivo pós-login — baixa todos os dados necessários
    syncOnLogin().catch(console.warn)
    return true
  },

  criarConta: async (senha: string) => {
    await setupAccount(senha)
    set({ autenticado: true, contaConfigurada: true })
  },

  recuperarConta: async (novaSenha: string) => {
    const chave = await recuperarCofreComNuvem(novaSenha)
    if (!chave) return false
    set({ autenticado: true })
    // Sync agressivo pós-recuperação — baixa todos os dados
    syncOnLogin().catch(console.warn)
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
