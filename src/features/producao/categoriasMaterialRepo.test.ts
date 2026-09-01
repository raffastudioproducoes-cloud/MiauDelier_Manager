import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../../db/schema'
import { criarCategoriaMaterial, listarCategoriasMaterial, atualizarCategoriaMaterial, excluirCategoriaMaterial } from './categoriasMaterialRepo'
import { criarMaterial } from './materiaisRepo'

describe('repositório de categorias de material', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  it('cria e lista categorias', async () => {
    await criarCategoriaMaterial('Resinas')
    await criarCategoriaMaterial('Pigmentos')
    const categorias = await listarCategoriasMaterial()
    expect(categorias.map((c) => c.nome).sort()).toEqual(['Pigmentos', 'Resinas'])
  })

  it('atualiza o nome de uma categoria', async () => {
    const id = await criarCategoriaMaterial('Resinas')
    await atualizarCategoriaMaterial(id, 'Resinas Epóxi')
    const categorias = await listarCategoriasMaterial()
    expect(categorias[0].nome).toBe('Resinas Epóxi')
  })

  it('recusa excluir categoria referenciada por um material', async () => {
    const categoriaId = await criarCategoriaMaterial('Resinas')
    await criarMaterial({ nome: 'Resina X', categoriaId, unidade: 'ml', quantidadeEstoque: 100, custoUnitario: 0.1 })
    await expect(excluirCategoriaMaterial(categoriaId)).rejects.toThrow(/material/i)
  })

  it('exclui categoria sem material vinculado', async () => {
    const categoriaId = await criarCategoriaMaterial('Resinas')
    await excluirCategoriaMaterial(categoriaId)
    expect(await listarCategoriasMaterial()).toHaveLength(0)
  })
})
