import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../db/schema'
import {
  hasAccountConfigured,
  setupAccount,
  login,
  getSessionKey,
  clearSession,
  CHAVE_VERIFICADOR,
} from './auth'

describe('auth de usuário único', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
    clearSession()
  })

  it('não tem conta configurada num banco novo', async () => {
    expect(await hasAccountConfigured()).toBe(false)
  })

  it('cria conta e permite login com a senha certa', async () => {
    await setupAccount('senha-do-rafa-2026')
    expect(await hasAccountConfigured()).toBe(true)

    const key = await login('senha-do-rafa-2026')
    expect(key).not.toBeNull()
    expect(getSessionKey()).toBe(key)
  })

  it('rejeita login com senha errada', async () => {
    await setupAccount('senha-certa')
    clearSession()
    const key = await login('senha-errada')
    expect(key).toBeNull()
    expect(getSessionKey()).toBeNull()
  })

  it('recusa criar conta por cima de uma conta existente', async () => {
    await setupAccount('senha-antiga')

    await expect(setupAccount('senha-nova-2026')).rejects.toThrow(/já existe uma conta/i)

    const key = await login('senha-antiga')
    expect(key).not.toBeNull()
  })

  it('sobrescreve salt e verificador por chave, sem duplicar linhas em configuracoes', async () => {
    await setupAccount('senha-antiga')
    await setupAccount('senha-nova-2026', { apagandoDadosExistentes: true })

    const linhas = await db.configuracoes.toArray()
    expect(linhas).toHaveLength(2)

    const key = await login('senha-nova-2026')
    expect(key).not.toBeNull()

    clearSession()
    const keyComSenhaAntiga = await login('senha-antiga')
    expect(keyComSenhaAntiga).toBeNull()
  })

  it('grava salt e verificador atomicamente', async () => {
    await setupAccount('senha-atomica')

    const linhas = await db.configuracoes.toArray()
    expect(linhas.map((linha) => linha.chave).sort()).toEqual(['auth.salt', 'auth.verificador'])
  })

  it('não confunde conta corrompida (salt sem verificador) com senha errada', async () => {
    await setupAccount('senha-certa')
    const verificador = await db.configuracoes.where('chave').equals(CHAVE_VERIFICADOR).first()
    await db.configuracoes.delete(verificador!.id!)
    clearSession()

    await expect(login('senha-certa')).rejects.toThrow(/corrompida/i)
    expect(getSessionKey()).toBeNull()
  })
})
