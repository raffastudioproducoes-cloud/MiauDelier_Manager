import { create } from 'zustand'
import { hasAccountConfigured, setupAccount, login, clearSession } from '../lib/auth'

interface AuthState {
  autenticado: boolean
  contaConfigurada: boolean | null
  carregarEstadoInicial: () => Promise<void>
  entrar: (senha: string) => Promise<boolean>
  criarConta: (senha: string) => Promise<void>
  sair: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  autenticado: false,
  contaConfigurada: null,

  carregarEstadoInicial: async () => {
    const existe = await hasAccountConfigured()
    set({ contaConfigurada: existe })
  },

  entrar: async (senha: string) => {
    const chave = await login(senha)
    if (!chave) return false
    set({ autenticado: true })
    return true
  },

  criarConta: async (senha: string) => {
    await setupAccount(senha)
    set({ autenticado: true, contaConfigurada: true })
  },

  sair: () => {
    clearSession()
    set({ autenticado: false })
  },
}))
