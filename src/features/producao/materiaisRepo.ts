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

export async function reporEstoqueMaterial(materialId: number, quantidadeAdicionada: number): Promise<void> {
  const material = await db.materiais.get(materialId)
  if (!material) throw new Error('Material não encontrado')
  await db.materiais.update(materialId, { quantidadeEstoque: material.quantidadeEstoque + quantidadeAdicionada })
}

export async function atualizarMaterial(materialId: number, dados: Omit<NovoMaterial, 'quantidadeEstoque'>): Promise<void> {
  await db.materiais.update(materialId, dados)
}

export async function excluirMaterial(materialId: number): Promise<void> {
  await db.materiais.delete(materialId)
}
