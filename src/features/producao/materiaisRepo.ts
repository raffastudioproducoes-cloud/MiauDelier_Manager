import { db, type Material, type TipoClassificacaoMaterial } from '../../db/schema'
import { cifrarCampo } from '../../lib/camposCifrados'
import { registrarAuditoria } from '../auditoria/auditoriaRepo'

export interface NovoMaterial {
  nome: string
  categoriaId: number
  subcategoriaId?: number
  unidade: string
  quantidadeEstoque: number
  custoUnitario: number
  valorFrete?: number
  tipoClassificacao?: TipoClassificacaoMaterial
}

export interface RegistrarCompraParams {
  materialId?: number
  novoMaterial?: NovoMaterial
  quantidadeComprada: number
  valorTotalPago: number
  valorFrete?: number
  atualizarCustoUnitario?: boolean
  novoCustoUnitarioCalculado?: number
  contaIdFinanceira?: number
  dataCompra?: string
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

export async function registrarCompraMaterial(params: RegistrarCompraParams): Promise<number> {
  const data = params.dataCompra ?? new Date().toISOString()
  const valorCifrado =
    params.contaIdFinanceira && params.valorTotalPago > 0
      ? await cifrarCampo(params.valorTotalPago.toString())
      : ''

  return db.transaction(
    'rw',
    [db.materiais, db.categoriasMaterial, db.contas, db.transacoes, db.auditoria],
    async () => {
      let targetMaterialId = params.materialId
      let nomeMaterial: string
      let unidadeMaterial: string

      if (!targetMaterialId) {
        if (!params.novoMaterial) throw new Error('Dados do novo material são obrigatórios')
        const matParaAdd = {
          ...params.novoMaterial,
          quantidadeEstoque: (params.novoMaterial.quantidadeEstoque || 0) + params.quantidadeComprada
        }
        targetMaterialId = (await db.materiais.add(matParaAdd)) as number
        nomeMaterial = matParaAdd.nome
        unidadeMaterial = matParaAdd.unidade
      } else {
        const mat = await db.materiais.get(targetMaterialId)
        if (!mat) throw new Error('Material não encontrado')
        nomeMaterial = mat.nome
        unidadeMaterial = mat.unidade
        const novaQtd = mat.quantidadeEstoque + params.quantidadeComprada
        const updates: Partial<Material> = { quantidadeEstoque: novaQtd }
        if (
          params.atualizarCustoUnitario &&
          params.novoCustoUnitarioCalculado !== undefined &&
          params.novoCustoUnitarioCalculado >= 0
        ) {
          updates.custoUnitario = params.novoCustoUnitarioCalculado
        }
        if (params.valorFrete !== undefined) {
          updates.valorFrete = params.valorFrete
        }
        await db.materiais.update(targetMaterialId, updates)
      }

      if (params.contaIdFinanceira && valorCifrado) {
        await db.transacoes.add({
          contaId: params.contaIdFinanceira,
          tipo: 'saida',
          valorCriptografado: valorCifrado,
          descricao: `Compra de insumos: ${nomeMaterial} (+${params.quantidadeComprada} ${unidadeMaterial})`,
          data,
        })
      }

      return targetMaterialId
    },
  )
}

export async function atualizarMaterial(materialId: number, dados: Omit<NovoMaterial, 'quantidadeEstoque'>): Promise<void> {
  await db.materiais.update(materialId, dados)
}

export async function excluirMaterial(materialId: number): Promise<void> {
  await db.transaction('rw', db.materiais, db.auditoria, async () => {
    await db.materiais.delete(materialId)
    await registrarAuditoria('material', materialId, 'exclusao')
  })
}
