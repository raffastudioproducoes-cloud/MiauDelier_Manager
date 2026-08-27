import { db, type Material } from '../../db/schema'

export interface NovoMaterial {
  nome: string
  categoriaId: number
  unidade: string
  quantidadeEstoque: number
  custoUnitario: number
}

export async function criarMaterial(novo: NovoMaterial): Promise<number> {
  const id = await db.materiais.add(novo)
  return id as number
}

export async function listarMateriais(): Promise<Material[]> {
  return db.materiais.toArray()
}

export async function atualizarEstoqueMaterial(materialId: number, novaQuantidade: number): Promise<void> {
  await db.materiais.update(materialId, { quantidadeEstoque: novaQuantidade })
}
