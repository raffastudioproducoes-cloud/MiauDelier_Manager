import { transacaoSincronizada } from '../../lib/transacaoSincronizada'
import { transacaoComEstoque } from './estoqueServidor'
import { db, type HistoricoPrecoMaterial, type Material, type TipoClassificacaoMaterial } from '../../db/schema'
import { registrarAuditoria } from '../auditoria/auditoriaRepo'
import { exigirConexaoEstoque } from './estoque'

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
  valorProdutos?: number
  valorFrete?: number
  valorDesconto?: number
  atualizarCustoUnitario?: boolean
  novoCustoUnitarioCalculado?: number
  contaIdFinanceira?: number
  dataCompra?: string
}

export async function criarMaterial(novo: NovoMaterial): Promise<number> {
  return transacaoSincronizada(async () => {
  if (!Number.isFinite(novo.quantidadeEstoque) || novo.quantidadeEstoque < 0) throw new Error('O estoque não pode ser negativo.')
  const id = await db.materiais.add(novo)
  return id as number

  })
}

export async function listarMateriais(): Promise<Material[]> {
  return db.materiais.toArray()
}

export async function listarHistoricoPrecosMateriais(): Promise<HistoricoPrecoMaterial[]> {
  return db.historicoPrecosMateriais.orderBy('dataCompra').reverse().toArray()
}

export async function limparHistoricoPrecosVencido(agora = new Date()): Promise<number> {
  return transacaoSincronizada(async () => {
  const limite = new Date(agora)
  limite.setFullYear(limite.getFullYear() - 1)
  const vencidos = await db.historicoPrecosMateriais
    .filter((registro) => new Date(registro.dataCompra) < limite)
    .toArray()
  await db.historicoPrecosMateriais.bulkDelete(vencidos.map((registro) => registro.id!).filter(Boolean))
  return vencidos.length

  })
}

async function atualizarEstoqueMaterialInterno(materialId: number, novaQuantidade: number): Promise<void> {
  if (!Number.isFinite(novaQuantidade) || novaQuantidade < 0) throw new Error('O estoque não pode ser negativo.')
  await db.transaction('rw', db.materiais, async () => {
    const material = await db.materiais.get(materialId)
    if (!material) throw new Error('Material não encontrado')
    if (novaQuantidade < material.quantidadeEstoque) exigirConexaoEstoque()
    await db.materiais.update(materialId, { quantidadeEstoque: novaQuantidade })
  })
}

async function reporEstoqueMaterialInterno(materialId: number, quantidadeAdicionada: number): Promise<void> {
  if (!Number.isFinite(quantidadeAdicionada) || quantidadeAdicionada < 0) throw new Error('A reposição não pode ser negativa.')
  await db.transaction('rw', db.materiais, async () => {
    const material = await db.materiais.get(materialId)
    if (!material) throw new Error('Material não encontrado')
    const novoSaldo = material.quantidadeEstoque + quantidadeAdicionada
    if (!Number.isFinite(novoSaldo) || novoSaldo < 0) throw new Error('O estoque não pode ser negativo.')
    await db.materiais.update(materialId, { quantidadeEstoque: novoSaldo })
  })
}

async function registrarCompraMaterialInterno(params: RegistrarCompraParams): Promise<number> {
  if (!Number.isFinite(params.quantidadeComprada) || params.quantidadeComprada <= 0) throw new Error('A quantidade comprada deve ser maior que zero.')
  if (params.novoMaterial && (!Number.isFinite(params.novoMaterial.quantidadeEstoque) || params.novoMaterial.quantidadeEstoque < 0)) throw new Error('O estoque não pode ser negativo.')
  const data = params.dataCompra ?? new Date().toISOString()
  const valorCifrado =
    params.contaIdFinanceira && params.valorTotalPago > 0
      ? params.valorTotalPago.toString()
      : ''

  return db.transaction(
    'rw',
    [db.materiais, db.historicoPrecosMateriais, db.categoriasMaterial, db.contas, db.transacoes, db.auditoria],
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
        if (!Number.isFinite(novaQtd) || novaQtd < 0) throw new Error('O estoque não pode ser negativo.')
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

      await db.historicoPrecosMateriais.add({
        materialId: targetMaterialId,
        nomeMaterial,
        unidade: unidadeMaterial,
        quantidadeComprada: params.quantidadeComprada,
        valorProdutos: params.valorProdutos ?? params.valorTotalPago - (params.valorFrete ?? 0) + (params.valorDesconto ?? 0),
        valorFrete: params.valorFrete ?? 0,
        valorDesconto: params.valorDesconto ?? 0,
        valorTotalPago: params.valorTotalPago,
        custoUnitario: params.novoCustoUnitarioCalculado ?? params.valorTotalPago / params.quantidadeComprada,
        dataCompra: data,
        registradoEm: new Date().toISOString(),
      })

      return targetMaterialId
    },
  )
}

export async function atualizarMaterial(materialId: number, dados: Omit<NovoMaterial, 'quantidadeEstoque'>): Promise<void> {
  return transacaoSincronizada(async () => {
  await db.materiais.update(materialId, dados)

  })
}

export async function excluirMaterial(materialId: number): Promise<void> {
  return transacaoSincronizada(async () => {
  await db.transaction('rw', db.materiais, db.auditoria, async () => {
    await db.materiais.delete(materialId)
    await registrarAuditoria('material', materialId, 'exclusao')
  })

  })
}

export const atualizarEstoqueMaterial = (...args: Parameters<typeof atualizarEstoqueMaterialInterno>): ReturnType<typeof atualizarEstoqueMaterialInterno> => transacaoComEstoque(() => atualizarEstoqueMaterialInterno(...args))

export const reporEstoqueMaterial = (...args: Parameters<typeof reporEstoqueMaterialInterno>): ReturnType<typeof reporEstoqueMaterialInterno> => transacaoComEstoque(() => reporEstoqueMaterialInterno(...args))

export const registrarCompraMaterial = (...args: Parameters<typeof registrarCompraMaterialInterno>): ReturnType<typeof registrarCompraMaterialInterno> => transacaoComEstoque(() => registrarCompraMaterialInterno(...args))
