import { describe, it, expect, beforeEach } from 'vitest'
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

  it('entra com senha certa e recusa senha errada', async () => {
    await useAuthStore.getState().criarConta('senha-certa')
    useAuthStore.setState({ autenticado: false })

    const falhou = await useAuthStore.getState().entrar('senha-errada')
    expect(falhou).toBe(false)
    expect(useAuthStore.getState().autenticado).toBe(false)

    const sucesso = await useAuthStore.getState().entrar('senha-certa')
    expect(sucesso).toBe(true)
    expect(useAuthStore.getState().autenticado).toBe(true)
  })

  it('sai e limpa o estado autenticado', async () => {
    await useAuthStore.getState().criarConta('senha-forte')
    useAuthStore.getState().sair()
    expect(useAuthStore.getState().autenticado).toBe(false)
  })
})
