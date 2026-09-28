import { db, type CategoriaMaterial, type TipoClassificacaoMaterial } from '../../db/schema'

export async function criarCategoriaMaterial(
  nome: string,
  categoriaPaiId?: number,
  tipoClassificacao?: TipoClassificacaoMaterial,
): Promise<number> {
  jaInicializadoPadrao = true
  const id = await db.categoriasMaterial.add({ nome, categoriaPaiId, tipoClassificacao })
  return id as number
}

export const CATEGORIAS_PADRAO_SUGERIDAS: { nome: string; tipoClassificacao: TipoClassificacaoMaterial }[] = [
  { nome: 'Insumos & Consumíveis', tipoClassificacao: 'consumivel' },
  { nome: 'Ferramentas & Equipamentos', tipoClassificacao: 'ferramenta' },
  { nome: 'Administrativo & Embalagens', tipoClassificacao: 'administrativo' },
  { nome: 'EPIs & Proteção', tipoClassificacao: 'epi' },
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
  
  const config = await db.configuracoes.where('chave').equals('categorias_padrao_criadas').first()
  if (config?.valor === 'true') {
    jaInicializadoPadrao = true
    return
  }

  const total = await db.categoriasMaterial.count()
  if (total === 0) {
    for (const item of CATEGORIAS_PADRAO_SUGERIDAS) {
      const existe = await db.categoriasMaterial.where('nome').equals(item.nome).first()
      if (!existe) {
        await db.categoriasMaterial.add({ nome: item.nome, tipoClassificacao: item.tipoClassificacao })
      }
    }
  }
  
  const checkDbConfig = await db.configuracoes.where('chave').equals('categorias_padrao_criadas').first()
  if (!checkDbConfig) {
    await db.configuracoes.add({ chave: 'categorias_padrao_criadas', valor: 'true' })
  }
  jaInicializadoPadrao = true
}

export async function listarCategoriasMaterial(): Promise<CategoriaMaterial[]> {
  await garantirCategoriasPadrao()
  return db.categoriasMaterial.toArray()
}

export async function atualizarCategoriaMaterial(
  categoriaId: number,
  nome: string,
  categoriaPaiId?: number,
  tipoClassificacao?: TipoClassificacaoMaterial,
): Promise<void> {
  await db.categoriasMaterial.update(categoriaId, { nome, categoriaPaiId, tipoClassificacao })
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
