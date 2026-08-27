import { db, type CategoriaMaterial } from '../../db/schema'

export async function criarCategoriaMaterial(nome: string): Promise<number> {
  const id = await db.categoriasMaterial.add({ nome })
  return id as number
}

export async function listarCategoriasMaterial(): Promise<CategoriaMaterial[]> {
  return db.categoriasMaterial.toArray()
}
