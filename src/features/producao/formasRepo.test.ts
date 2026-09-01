import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../../db/schema'
import { criarForma, listarFormas, atualizarForma, excluirForma } from './formasRepo'
import { listarAuditoria } from '../auditoria/auditoriaRepo'

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

  it('atualiza uma forma existente', async () => {
    const id = await criarForma({ nome: 'Molde X', geometria: 'direto', dimensoesCm: {}, volumeDiretoMl: 20 })
    await atualizarForma(id, { nome: 'Molde X Editado', geometria: 'direto', dimensoesCm: {}, volumeDiretoMl: 25 })
    const formas = await listarFormas()
    expect(formas[0].nome).toBe('Molde X Editado')
  })

  it('exclui uma forma', async () => {
    const id = await criarForma({ nome: 'Molde Y', geometria: 'direto', dimensoesCm: {}, volumeDiretoMl: 20 })
    await excluirForma(id)
    expect(await listarFormas()).toHaveLength(0)

    const registros = await listarAuditoria()
    const registro = registros.find((r) => r.entidade === 'forma' && r.entidadeId === id)
    expect(registro).toBeDefined()
  })
})
