import { describe, it, expect, beforeEach, vi } from 'vitest'
import { db } from '../db/schema'
import { useAuthStore } from './authStore'

describe('authStore', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
    useAuthStore.setState({ autenticado: false, contaConfigurada: null })
  })

  it('carrega estado inicial sem conta configurada', async () => {
    await useAuthStore.getState().carregarEstadoInicial()
    expect(useAuthStore.getState().contaConfigurada).toBe(false)
    expect(useAuthStore.getState().autenticado).toBe(false)
  })

  it('cria conta e marca autenticado', async () => {
    await useAuthStore.getState().criarConta('senha-forte')
    expect(useAuthStore.getState().autenticado).toBe(true)
    expect(useAuthStore.getState().contaConfigurada).toBe(true)
  })

  it('aceita uma sessão OAuth do Supabase em dispositivo sem cache local', async () => {
    const { supabase } = await import('../lib/supabase')
    vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
      data: { session: { user: { id: 'usuario-google' } } },
      error: null,
    } as any)

    await useAuthStore.getState().carregarEstadoInicial()

    expect(useAuthStore.getState()).toMatchObject({ contaConfigurada: true, autenticado: true })
  })

  it('reabre a sessão local quando o dispositivo já foi configurado', async () => {
    await useAuthStore.getState().criarConta('senha-forte')
    useAuthStore.getState().sair()

    await expect(useAuthStore.getState().criarConta('senha-forte')).resolves.toBeUndefined()
    expect(useAuthStore.getState().autenticado).toBe(true)
  })

  it('não valida senha localmente', async () => {
    await useAuthStore.getState().criarConta('senha-certa')
    useAuthStore.setState({ autenticado: false })

    const sucesso = await useAuthStore.getState().entrar('qualquer-senha')
    expect(sucesso).toBe(true)
    expect(useAuthStore.getState().autenticado).toBe(true)
  })

  it('sai e limpa o estado autenticado', async () => {
    await useAuthStore.getState().criarConta('senha-forte')
    useAuthStore.getState().sair()
    expect(useAuthStore.getState().autenticado).toBe(false)
  })

  it('não restaura sessão apenas por marcador local sem sessão Supabase', async () => {
    await useAuthStore.getState().criarConta('senha-de-teste')
    // Resetar o estado da store mantendo os dados de IndexedDB + localStorage
    useAuthStore.setState({ autenticado: false, contaConfigurada: null })

    await useAuthStore.getState().carregarEstadoInicial()
    expect(useAuthStore.getState().contaConfigurada).toBe(false)
    expect(useAuthStore.getState().autenticado).toBe(false)
  })
})
