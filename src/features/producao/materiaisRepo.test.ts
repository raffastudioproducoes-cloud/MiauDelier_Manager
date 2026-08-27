import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../../db/schema'
import { criarMaterial, listarMateriais, atualizarEstoqueMaterial } from './materiaisRepo'

describe('repositório de materiais', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  it('cria e lista um material', async () => {
    await criarMaterial({
      nome: 'Resina Cristal',
      categoriaId: 1,
      unidade: 'ml',
      quantidadeEstoque: 1000,
      custoUnitario: 0.15,
    })
    const materiais = await listarMateriais()
    expect(materiais).toHaveLength(1)
    expect(materiais[0].nome).toBe('Resina Cristal')
  })

  it('atualiza estoque de um material', async () => {
    const id = await criarMaterial({ nome: 'Resina', categoriaId: 1, unidade: 'ml', quantidadeEstoque: 500, custoUnitario: 0.1 })
    await atualizarEstoqueMaterial(id, 350)
    const materiais = await listarMateriais()
    expect(materiais[0].quantidadeEstoque).toBe(350)
  })
})
