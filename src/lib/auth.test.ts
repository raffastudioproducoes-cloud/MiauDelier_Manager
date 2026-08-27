import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { db } from '../db/schema'
import {
  hasAccountConfigured,
  setupAccount,
  login,
  getSessionKey,
  clearSession,
  CHAVE_VERIFICADOR,
  ContaBloqueadaError,
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

  describe('limite de tentativas de login', () => {
    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('bloqueia a 6ª tentativa mesmo com a senha certa após 5 erradas seguidas', async () => {
      await setupAccount('senha-certa')
      clearSession()

      for (let i = 0; i < 5; i++) {
        expect(await login('senha-errada')).toBeNull()
      }

      await expect(login('senha-certa')).rejects.toThrow(ContaBloqueadaError)
      expect(getSessionKey()).toBeNull()
    })

    it('desbloqueia com a senha certa depois que o tempo de bloqueio passa', async () => {
      const agora = vi.spyOn(Date, 'now').mockReturnValue(0)

      await setupAccount('senha-certa')
      clearSession()

      for (let i = 0; i < 5; i++) {
        await login('senha-errada')
      }
      await expect(login('senha-certa')).rejects.toThrow(ContaBloqueadaError)

      agora.mockReturnValue(31_000)

      const key = await login('senha-certa')
      expect(key).not.toBeNull()
      expect(getSessionKey()).toBe(key)
    })

    it('login bem-sucedido antes do limite não deixa resíduo de bloqueio', async () => {
      await setupAccount('senha-certa')
      clearSession()

      expect(await login('senha-errada')).toBeNull()
      expect(await login('senha-errada')).toBeNull()

      const key = await login('senha-certa')
      expect(key).not.toBeNull()

      clearSession()
      for (let i = 0; i < 4; i++) {
        expect(await login('senha-errada')).toBeNull()
      }
      const chaveDeNovo = await login('senha-certa')
      expect(chaveDeNovo).not.toBeNull()
    })

    it('conta corrompida continua tendo prioridade sobre senha errada, mesmo sem bloqueio ativo', async () => {
      await setupAccount('senha-certa')
      const verificador = await db.configuracoes.where('chave').equals(CHAVE_VERIFICADOR).first()
      await db.configuracoes.delete(verificador!.id!)
      clearSession()

      await expect(login('senha-errada')).rejects.toThrow(/corrompida/i)
    })
  })
})
