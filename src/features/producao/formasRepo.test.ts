import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../../db/schema'
import { criarForma, listarFormas } from './formasRepo'

describe('repositório de formas', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  it('cria e lista uma forma cilíndrica', async () => {
    await criarForma({
      nome: 'Porta-copo redondo',
      geometria: 'cilindrico',
      dimensoesCm: { raio: 5, altura: 1.5 },
    })
    const formas = await listarFormas()
    expect(formas).toHaveLength(1)
    expect(formas[0].geometria).toBe('cilindrico')
  })
})
