import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../../db/schema'
import { setupAccount } from '../../lib/auth'
import {
  hasChaveConfigurada,
  definirChaveGemini,
  obterChaveGemini,
  definirPersonalidade,
  obterPersonalidade,
} from './iaConfigRepo'

describe('configuração da IA', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
    await setupAccount('senha-do-ateliê')
  })

  it('não tem chave configurada por padrão', async () => {
    expect(await hasChaveConfigurada()).toBe(false)
    expect(await obterChaveGemini()).toBeNull()
  })

  it('define e recupera a chave decifrada corretamente', async () => {
    await definirChaveGemini('AIzaSy-chave-fake-de-teste')
    expect(await hasChaveConfigurada()).toBe(true)
    expect(await obterChaveGemini()).toBe('AIzaSy-chave-fake-de-teste')
  })

  it('não guarda a chave em claro no registro bruto do banco', async () => {
    await definirChaveGemini('AIzaSy-chave-fake-de-teste')
    const bruto = await db.configuracoes.where('chave').equals('ia.chaveGemini').first()
    expect(bruto?.valor).not.toContain('AIzaSy-chave-fake-de-teste')
  })

  it('recusa redefinir a chave depois de configurada (set-once)', async () => {
    await definirChaveGemini('chave-original')
    await expect(definirChaveGemini('chave-nova')).rejects.toThrow(/já configurada/i)
    expect(await obterChaveGemini()).toBe('chave-original')
  })

  it('personalidade padrão é técnica quando nunca configurada', async () => {
    expect(await obterPersonalidade()).toBe('tecnica')
  })

  it('define e recupera a personalidade escolhida', async () => {
    await definirPersonalidade('acolhedora')
    expect(await obterPersonalidade()).toBe('acolhedora')
  })
})
