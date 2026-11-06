import type { CategoriaMaterial, Material, TipoClassificacaoMaterial } from '../../db/schema'

export function classificarMaterial(material: Material, categorias: CategoriaMaterial[]): TipoClassificacaoMaterial {
  if (material.tipoClassificacao) return material.tipoClassificacao
  let id: number | undefined = material.subcategoriaId ?? material.categoriaId
  const vistos = new Set<number>()
  while (id !== undefined && !vistos.has(id)) {
    vistos.add(id)
    const categoria = categorias.find(item => item.id === id)
    if (!categoria) break
    if (categoria.tipoClassificacao) return categoria.tipoClassificacao
    const nome = categoria.nome.toLowerCase()
    if (nome.includes('epi')) return 'epi'
    if (nome.includes('ferramenta') || nome.includes('equipamento')) return 'ferramenta'
    if (nome.includes('administrativo') || nome.includes('embalagen')) return 'administrativo'
    id = categoria.categoriaPaiId
  }
  // Registros antigos podem ter subcategoria sem vínculo com a categoria pai.
  const principal = categorias.find(item => item.id === material.categoriaId)
  if (principal?.tipoClassificacao) return principal.tipoClassificacao
  return 'consumivel'
}
