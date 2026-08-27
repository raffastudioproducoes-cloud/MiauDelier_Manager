import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../db/schema'
import { setupAccount, clearSession } from './auth'
import { cifrarCampo, decifrarCampo, SessaoFechadaError } from './camposCifrados'

describe('camadas de campos cifrados', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
    clearSession()
  })

  it('cifra e decifra um valor com a sessão aberta', async () => {
    await setupAccount('senha-do-ateliê')
    const cifrado = await cifrarCampo('1234.56')
    expect(cifrado).not.toContain('1234.56')

    const claro = await decifrarCampo(cifrado)
    expect(claro).toBe('1234.56')
  })

  it('recusa cifrar sem sessão aberta', async () => {
    await expect(cifrarCampo('1234.56')).rejects.toThrow(SessaoFechadaError)
  })

  it('recusa decifrar sem sessão aberta', async () => {
    await setupAccount('senha-do-ateliê')
    const cifrado = await cifrarCampo('1234.56')
    clearSession()
    await expect(decifrarCampo(cifrado)).rejects.toThrow(SessaoFechadaError)
  })
})
