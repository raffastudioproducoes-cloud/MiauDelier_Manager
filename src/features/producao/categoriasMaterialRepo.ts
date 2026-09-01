import { db, type CategoriaMaterial } from '../../db/schema'

export async function criarCategoriaMaterial(nome: string): Promise<number> {
  const id = await db.categoriasMaterial.add({ nome })
  return id as number
}

export async function listarCategoriasMaterial(): Promise<CategoriaMaterial[]> {
  return db.categoriasMaterial.toArray()
}

export async function atualizarCategoriaMaterial(categoriaId: number, nome: string): Promise<void> {
  await db.categoriasMaterial.update(categoriaId, { nome })
}

export async function excluirCategoriaMaterial(categoriaId: number): Promise<void> {
  const quantidadeMateriais = await db.materiais.where('categoriaId').equals(categoriaId).count()
  if (quantidadeMateriais > 0) {
    throw new Error('Não é possível excluir uma categoria que ainda tem material vinculado.')
  }
  await db.categoriasMaterial.delete(categoriaId)
}
