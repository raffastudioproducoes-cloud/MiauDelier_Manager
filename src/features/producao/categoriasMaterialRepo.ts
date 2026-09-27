import { db, type CategoriaMaterial } from '../../db/schema'

export async function criarCategoriaMaterial(nome: string, categoriaPaiId?: number): Promise<number> {
  jaInicializadoPadrao = true
  const id = await db.categoriasMaterial.add({ nome, categoriaPaiId })
  return id as number
}

export const CATEGORIAS_PADRAO_SUGERIDAS = [
  'Resinas & Líquidos',
  'Silicones & Moldes',
  'Pigmentos & Artes',
  'Adornos & Decoração',
  'Consumíveis & Lixas',
  'Equipamentos & EPIs',
  'Administrativo & Embalagens',
]

let jaInicializadoPadrao = false

export function resetarInicializacaoCategoriasPadrao(): void {
  jaInicializadoPadrao = false
}

export async function garantirCategoriasPadrao(): Promise<void> {
  if (jaInicializadoPadrao) return
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
    jaInicializadoPadrao = true
    return
  }
  const total = await db.categoriasMaterial.count()
  if (total === 0) {
    for (const nome of CATEGORIAS_PADRAO_SUGERIDAS) {
      const existe = await db.categoriasMaterial.where('nome').equals(nome).first()
      if (!existe) {
        await db.categoriasMaterial.add({ nome })
      }
    }
  }
  jaInicializadoPadrao = true
}

export async function listarCategoriasMaterial(): Promise<CategoriaMaterial[]> {
  await garantirCategoriasPadrao()
  return db.categoriasMaterial.toArray()
}

export async function atualizarCategoriaMaterial(categoriaId: number, nome: string, categoriaPaiId?: number): Promise<void> {
  await db.categoriasMaterial.update(categoriaId, { nome, categoriaPaiId })
}

export async function excluirCategoriaMaterial(categoriaId: number): Promise<void> {
  const quantidadeMateriaisCat = await db.materiais.where('categoriaId').equals(categoriaId).count()
  const quantidadeMateriaisSubcat = await db.materiais.where('subcategoriaId').equals(categoriaId).count()
  if (quantidadeMateriaisCat > 0 || quantidadeMateriaisSubcat > 0) {
    throw new Error('Não é possível excluir uma categoria/subcategoria que ainda tem material vinculado.')
  }
  const temSubcategorias = await db.categoriasMaterial.where('categoriaPaiId').equals(categoriaId).count()
  if (temSubcategorias > 0) {
    throw new Error('Não é possível excluir uma categoria que possui subcategorias vinculadas. Exclua as subcategorias primeiro.')
  }
  await db.categoriasMaterial.delete(categoriaId)
}
