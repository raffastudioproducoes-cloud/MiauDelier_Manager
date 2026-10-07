import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../db/schema'
import { cifrarCampo, decifrarCampo } from './camposCifrados'

describe('camada de dados legíveis', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  it('preserva valores legíveis para sincronização backend', async () => {
    const valor = await cifrarCampo('1234.56')
    expect(valor).toBe('1234.56')
    const claro = await decifrarCampo(valor)
    expect(claro).toBe('1234.56')
  })

})
