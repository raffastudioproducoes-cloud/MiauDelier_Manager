import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../../db/schema'
import {
  criarMaterial,
  listarMateriais,
  atualizarEstoqueMaterial,
  reporEstoqueMaterial,
  atualizarMaterial,
  excluirMaterial,
} from './materiaisRepo'

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

  it('repõe estoque somando à quantidade existente', async () => {
    const id = await criarMaterial({ nome: 'Resina', categoriaId: 1, unidade: 'ml', quantidadeEstoque: 100, custoUnitario: 0.1 })
    await reporEstoqueMaterial(id, 50)
    const materiais = await listarMateriais()
    expect(materiais[0].quantidadeEstoque).toBe(150)
  })

  it('atualiza nome, unidade e custo de um material existente', async () => {
    const id = await criarMaterial({ nome: 'Resina', categoriaId: 1, unidade: 'ml', quantidadeEstoque: 100, custoUnitario: 0.1 })
    await atualizarMaterial(id, { nome: 'Resina Cristal', unidade: 'ml', custoUnitario: 0.12, categoriaId: 1 })
    const materiais = await listarMateriais()
    expect(materiais[0].nome).toBe('Resina Cristal')
    expect(materiais[0].custoUnitario).toBe(0.12)
  })

  it('exclui um material', async () => {
    const id = await criarMaterial({ nome: 'Resina', categoriaId: 1, unidade: 'ml', quantidadeEstoque: 100, custoUnitario: 0.1 })
    await excluirMaterial(id)
    expect(await listarMateriais()).toHaveLength(0)
  })
})
