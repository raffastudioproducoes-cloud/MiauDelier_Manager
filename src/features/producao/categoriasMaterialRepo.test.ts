import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../../db/schema'
import { criarCategoriaMaterial, listarCategoriasMaterial } from './categoriasMaterialRepo'

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
})
