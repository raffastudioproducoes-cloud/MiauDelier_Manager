import { transacaoSincronizada } from '../../lib/transacaoSincronizada'
import { transacaoComEstoque } from './estoqueServidor'
import { db, type Peca, type EventoPeca, type StatusPeca } from '../../db/schema'
import { registrarAuditoria } from '../auditoria/auditoriaRepo'
import { converterQuantidade, ehIncompativel } from '../../lib/unidades'
import { exigirConexaoEstoque, exigirEstoque } from './estoque'
import { calcularPrecificacao } from '../pricing/pricing'
import { calcularDesgasteEquipamentos } from './desgasteEquipamentos'
import { obterTarifasConfig } from '../pricing/tarifasConfigRepo'
import { obterIdNumericoPecaDisponivel } from './identidadePeca'

export interface ConsumoComMaterial {
  materialId: number
  quantidade: number
  nomeMaterial: string
  unidade?: string
  custoUnitarioNoConsumo?: number
}

export interface NovoConsumo {
  materialId: number
  quantidade: number
  unidade?: string
}

export interface NovaPeca {
  nome: string
  formaId: number
  formasAdicionais?: Peca['formasAdicionais']
  consumos: NovoConsumo[]
  imagemUrl?: string
  volumeResinaMl?: number
  curaMinutos?: number
  horasMaoDeObra?: number
  usosEnergia?: Peca['usosEnergia']
  litrosAgua?: number
  custoAgua?: number
  custoEpiInsumos?: number
  valorPropagandaTotal?: number
  diasPropaganda?: number
  custoPropagandaCalculado?: number
  valorFrete?: number
  precoVenda?: number
  percentualTaxas?: number
  margemDesejada?: number
}

export interface PecaComForma extends Peca {
  nomeForma: string
}

function formasDaPeca(peca: Pick<Peca, 'formaId' | 'formasAdicionais'>): Map<number, number> {
  const totais = new Map<number, number>()
  for (const item of [{ formaId: peca.formaId, quantidade: 1 }, ...(peca.formasAdicionais ?? [])]) {
    if (!Number.isSafeInteger(item.formaId) || item.formaId <= 0 || !Number.isSafeInteger(item.quantidade) || item.quantidade <= 0) {
      throw new Error('Selecione formas e quantidades válidas.')
    }
    totais.set(item.formaId, (totais.get(item.formaId) ?? 0) + item.quantidade)
  }
  return totais
}

async function ajustarUsosFormas(anteriores: Map<number, number>, novas: Map<number, number>, validarProntas = false): Promise<number> {
  let custo = 0
  for (const id of new Set([...anteriores.keys(), ...novas.keys()])) {
    const forma = await db.formas.get(id)
    const quantidade = novas.get(id) ?? 0
    // Uma forma removida anteriormente não pode impedir o estorno dos materiais.
    if (!forma && quantidade === 0) continue
    if (!forma) throw new Error('Forma não encontrada.')
    const diferenca = quantidade - (anteriores.get(id) ?? 0)
    if (validarProntas && diferenca > 0 && forma.status !== undefined && forma.status !== 'pronta') throw new Error('A forma selecionada ainda não está pronta.')
    if (diferenca !== 0) await db.formas.update(id, { usosRealizados: Math.max(0, (forma.usosRealizados ?? 0) + diferenca) })
    if (forma.vidaUtilUsos && forma.vidaUtilUsos > 0) custo += quantidade * (forma.custoFabricacao ?? 0) / forma.vidaUtilUsos
  }
  return custo
}

async function custoFormas(formas: Map<number, number>): Promise<number> {
  let custo = 0
  for (const [id, quantidade] of formas) {
    const forma = await db.formas.get(id)
    if (!forma) throw new Error('Forma não encontrada.')
    if (forma.vidaUtilUsos && forma.vidaUtilUsos > 0) custo += quantidade * (forma.custoFabricacao ?? 0) / forma.vidaUtilUsos
  }
  return custo
}

async function criarPecaInterno(nova: NovaPeca): Promise<number> {
  if (nova.consumos.length > 0) exigirConexaoEstoque()
  return db.transaction('rw', db.pecas, db.consumosPeca, db.eventosPeca, db.materiais, db.formas, async () => {
    const agora = new Date().toISOString()
    // A contagem de peças pode diminuir após exclusão e repetir números de série.
    // UUID permanece estável no backup/sincronização e não exige um contador compartilhado.
    const identificadorUnico = crypto.randomUUID()
    const idNumerico = await obterIdNumericoPecaDisponivel(id => db.pecas.get(id))
    // Base 36 é uma representação reversível do UUID, mais curta que seus 36 caracteres.
    const numeroSerie = `#P-${BigInt(`0x${identificadorUnico.replace(/-/g, '')}`).toString(36).toUpperCase().padStart(25, '0')}`

    const pecaId = (await db.pecas.add({
      id: idNumerico,
      identificadorUnico,
      numeroSerie,
      nome: nova.nome,
      formaId: nova.formaId,
      formasAdicionais: nova.formasAdicionais ?? [],
      status: 'planejada',
      criadaEm: agora,
      imagemUrl: nova.imagemUrl,
      volumeResinaMl: nova.volumeResinaMl,
      curaMinutos: nova.curaMinutos,
      horasMaoDeObra: nova.horasMaoDeObra,
      usosEnergia: nova.usosEnergia,
      litrosAgua: nova.litrosAgua,
      custoAgua: nova.custoAgua,
      custoEpiInsumos: nova.custoEpiInsumos,
      valorPropagandaTotal: nova.valorPropagandaTotal,
      diasPropaganda: nova.diasPropaganda,
      custoPropagandaCalculado: nova.custoPropagandaCalculado,
      valorFrete: nova.valorFrete,
      precoVenda: nova.precoVenda,
      percentualTaxas: nova.percentualTaxas,
      margemDesejada: nova.margemDesejada,
    })) as number

    for (const consumo of nova.consumos) {
      const material = await db.materiais.get(consumo.materialId)
      if (!material) throw new Error(`material ${consumo.materialId} não encontrado`)
      if (!Number.isFinite(consumo.quantidade) || consumo.quantidade <= 0) {
        throw new Error(`Quantidade consumida de "${material.nome}" precisa ser maior que zero.`)
      }

      const unidadeDigita = consumo.unidade || material.unidade
      if (ehIncompativel(unidadeDigita, material.unidade)) {
        throw new Error(
          `Unidade "${unidadeDigita}" é incompatível com a unidade "${material.unidade}" do material "${material.nome}".`,
        )
      }

      const { quantidadeConvertida } = converterQuantidade(consumo.quantidade, unidadeDigita, material.unidade)

      exigirEstoque(material, quantidadeConvertida)

      await db.consumosPeca.add({
        pecaId,
        materialId: consumo.materialId,
        quantidade: quantidadeConvertida,
        unidade: material.unidade,
        custoUnitarioNoConsumo: material.custoUnitario,
      })
      await db.materiais.update(consumo.materialId, {
        quantidadeEstoque: material.quantidadeEstoque - quantidadeConvertida,
      })
    }

    const custoFormasRegistrado = await ajustarUsosFormas(new Map(), formasDaPeca(nova), true)


    await db.eventosPeca.add({
      pecaId,
      tipo: 'criacao',
      descricao: `Peça criada e consumo de material e uso das formas registrados (amortização: R$ ${custoFormasRegistrado.toFixed(2)})`,
      criadoEm: agora,
    })

    return pecaId
  })
}


export async function listarPecas(): Promise<PecaComForma[]> {
  const pecas = await db.pecas.toArray()
  return Promise.all(
    pecas.map(async (peca) => {
      const forma = await db.formas.get(peca.formaId)
      return { ...peca, nomeForma: forma?.nome ?? '—' }
    }),
  )
}

export async function listarEventosDaPeca(pecaId: number): Promise<EventoPeca[]> {
  return db.eventosPeca.where('pecaId').equals(pecaId).toArray()
}

export async function listarConsumosDaPeca(pecaId: number): Promise<ConsumoComMaterial[]> {
  const consumos = await db.consumosPeca.where('pecaId').equals(pecaId).toArray()
  return Promise.all(
    consumos.map(async (consumo) => {
      const material = await db.materiais.get(consumo.materialId)
      const unidadeExibida = material?.unidade || consumo.unidade || ''
      return {
        materialId: consumo.materialId,
        quantidade: consumo.quantidade,
        nomeMaterial: material?.nome ?? '—',
        unidade: unidadeExibida,
        custoUnitarioNoConsumo: consumo.custoUnitarioNoConsumo,
      }
    }),
  )
}

async function atualizarStatusPecaInterno(pecaId: number, novoStatus: StatusPeca): Promise<void> {
  await db.transaction('rw', [db.pecas, db.consumosPeca, db.eventosPeca, db.materiais, db.formas, db.pedidos], async () => {
    const peca = await db.pecas.get(pecaId)
    if (!peca) throw new Error(`Peça ${pecaId} não encontrada`)

    const statusAnterior = peca.status
    if (statusAnterior === novoStatus) return
    if (statusAnterior === 'vendida' && (await db.pedidos.toArray()).some(pedido => pedido.vendaRegistradaEm && pedido.pecaIds.includes(pecaId))) throw new Error('Esta peça pertence a um pedido com venda registrada.')

    // Se transicionando PARA 'cancelada' (e antes não era cancelada): devolve material ao estoque e estorna o uso da forma
    if (novoStatus === 'cancelada' && statusAnterior !== 'cancelada') {
      const consumos = await db.consumosPeca.where('pecaId').equals(pecaId).toArray()
      for (const consumo of consumos) {
        const material = await db.materiais.get(consumo.materialId)
        if (!material) throw new Error(`Material ${consumo.materialId} não encontrado. Não foi possível devolver o estoque; restaure o material antes de cancelar.`)
        await db.materiais.update(consumo.materialId, {
          quantidadeEstoque: material.quantidadeEstoque + consumo.quantidade,
        })
      }
      await ajustarUsosFormas(formasDaPeca(peca), new Map())
      await db.pecas.update(pecaId, { status: 'cancelada' })
      await db.eventosPeca.add({
        pecaId,
        tipo: 'mudanca_status',
        descricao: 'Produção cancelada: materiais devolvidos ao estoque e uso do molde estornado',
        criadoEm: new Date().toISOString(),
      })
      return
    }

    // Se transicionando DE 'cancelada' PARA um status ativo: verifica estoque e debita novamente
    if (statusAnterior === 'cancelada' && novoStatus !== 'cancelada') {
      const consumos = await db.consumosPeca.where('pecaId').equals(pecaId).toArray()
      if (consumos.length > 0) exigirConexaoEstoque()
      for (const consumo of consumos) {
        const material = await db.materiais.get(consumo.materialId)
        if (!material) throw new Error(`Material ${consumo.materialId} não encontrado`)
        exigirEstoque(material, consumo.quantidade)
        await db.materiais.update(consumo.materialId, {
          quantidadeEstoque: material.quantidadeEstoque - consumo.quantidade,
        })
      }
      await ajustarUsosFormas(new Map(), formasDaPeca(peca), true)
      await db.pecas.update(pecaId, { status: novoStatus })
      await db.eventosPeca.add({
        pecaId,
        tipo: 'mudanca_status',
        descricao: `Produção reativada (${novoStatus}): materiais novamente debitados do estoque`,
        criadoEm: new Date().toISOString(),
      })
      return
    }

    // Mudança normal entre status ativos
    await db.pecas.update(pecaId, { status: novoStatus })
    await db.eventosPeca.add({
      pecaId,
      tipo: 'mudanca_status',
      descricao: `Status alterado para ${novoStatus}`,
      criadoEm: new Date().toISOString(),
    })
  })
}

export async function atualizarPrecoVendaPeca(pecaId: number, precoVenda: number): Promise<void> {
  return transacaoSincronizada(async () => {
  await db.transaction('rw', db.pecas, db.auditoria, async () => {
    const pecaAnterior = await db.pecas.get(pecaId)
    await db.pecas.update(pecaId, { precoVenda })
    await registrarAuditoria(
      'peca',
      pecaId,
      'alteracao_preco',
      pecaAnterior?.precoVenda !== undefined ? pecaAnterior.precoVenda.toString() : undefined,
      precoVenda.toString(),
    )
  })

  })
}

async function registrarVendaPecaInterno(
  pecaId: number,
  precoVenda: number,
  contaId: number,
  descricaoTransacao: string,
): Promise<void> {
  const valorCriptografado = precoVenda.toString()
  const agora = new Date().toISOString()

  await db.transaction('rw', [db.pecas, db.eventosPeca, db.contas, db.transacoes, db.auditoria, db.consumosPeca, db.materiais, db.formas, db.pedidos], async () => {
    const peca = await db.pecas.get(pecaId)
    if (!peca) throw new Error(`Peça ${pecaId} não encontrada`)
    if (peca.status === 'vendida' || (await db.pedidos.toArray()).some(pedido => pedido.vendaRegistradaEm && pedido.pecaIds.includes(pecaId))) throw new Error('A venda desta peça já foi registrada.')
    if (peca.status === 'cancelada') await atualizarStatusPeca(pecaId, 'planejada')
    await db.pecas.update(pecaId, { status: 'vendida', precoVenda })
    await db.eventosPeca.add({
      pecaId,
      tipo: 'mudanca_status',
      descricao: 'Status alterado para vendida',
      criadoEm: agora,
    })
    await db.transacoes.add({
      contaId,
      tipo: 'entrada',
      valorCriptografado,
      descricao: descricaoTransacao,
      data: agora,
    })
    await registrarAuditoria('peca', pecaId, 'venda', undefined, precoVenda.toString())
  })
}

async function excluirPecaInterno(pecaId: number): Promise<void> {
  await db.transaction('rw', [db.pecas, db.consumosPeca, db.eventosPeca, db.materiais, db.formas, db.auditoria, db.pedidos], async () => {
    const peca = await db.pecas.get(pecaId)
    if ((await db.pedidos.toArray()).some(pedido => pedido.vendaRegistradaEm && pedido.pecaIds.includes(pecaId))) throw new Error('Não é possível excluir uma peça de pedido com venda registrada.')
    // Se a peça NÃO estava cancelada, devolve o material ao estoque e estorna o uso do molde
    if (peca && peca.status !== 'cancelada') {
      const consumos = await db.consumosPeca.where('pecaId').equals(pecaId).toArray()
      for (const consumo of consumos) {
        const material = await db.materiais.get(consumo.materialId)
        if (!material) throw new Error(`Material ${consumo.materialId} não encontrado. Não foi possível devolver o estoque; restaure o material antes de excluir.`)
        await db.materiais.update(consumo.materialId, {
          quantidadeEstoque: material.quantidadeEstoque + consumo.quantidade,
        })
      }
      await ajustarUsosFormas(formasDaPeca(peca), new Map())
    }
    await db.consumosPeca.where('pecaId').equals(pecaId).delete()
    await db.eventosPeca.where('pecaId').equals(pecaId).delete()
    await db.pecas.delete(pecaId)
    await registrarAuditoria('peca', pecaId, 'exclusao')
  })
}

export async function atualizarImagemPeca(pecaId: number, imagemUrl?: string): Promise<void> {
  return transacaoSincronizada(async () => {
  await db.pecas.update(pecaId, { imagemUrl })

  })
}

export async function atualizarDadosProducaoPeca(pecaId: number, dados: Partial<Peca>): Promise<void> {
  return transacaoSincronizada(async () => {
  await db.pecas.update(pecaId, dados)
  await db.eventosPeca.add({
    pecaId,
    tipo: 'atualizacao_dados',
    descricao: 'Etapas e dados técnicos de produção/precificação da peça atualizados',
    criadoEm: new Date().toISOString(),
  })

  })
}

async function editarConsumosPecaInterno(pecaId: number, novos: NovoConsumo[], dados: Partial<Peca>): Promise<void> {
  const tarifas = await obterTarifasConfig()
  await db.transaction('rw', [db.pecas, db.consumosPeca, db.eventosPeca, db.materiais, db.formas, db.equipamentos, db.registrosVidaUtil], async () => {
    const peca = await db.pecas.get(pecaId)
    if (!peca) throw new Error('Peça não encontrada.')
    if (peca.usoConfirmadoEm) {
      const pecaRef = peca.identificadorUnico ?? `legado-${pecaId}`
      const ferramentas = await db.registrosVidaUtil.where('pecaRef').equals(pecaRef).filter(item => item.tipo === 'ferramenta').toArray()
      if (novos.some(item => ferramentas.some(f => f.recursoId === item.materialId))) throw new Error('Uma ferramenta reutilizável já confirmada não pode ser adicionada como material consumido.')
    }
    const anteriores = await db.consumosPeca.where('pecaId').equals(pecaId).toArray()
    const totaisAnteriores = new Map<number, number>()
    for (const c of anteriores) totaisAnteriores.set(c.materialId, (totaisAnteriores.get(c.materialId) ?? 0) + c.quantidade)
    const totaisNovos = new Map<number, number>()
    for (const item of novos) {
      const material = await db.materiais.get(item.materialId)
      if (!material || !Number.isFinite(item.quantidade) || item.quantidade <= 0) throw new Error('Material ou quantidade inválidos.')
      if (ehIncompativel(item.unidade || material.unidade, material.unidade)) throw new Error(`Unidade incompatível para ${material.nome}.`)
      const qtd = converterQuantidade(item.quantidade, item.unidade || material.unidade, material.unidade).quantidadeConvertida
      if (!Number.isFinite(qtd) || qtd <= 0) throw new Error('Quantidade inválida.')
      totaisNovos.set(item.materialId, (totaisNovos.get(item.materialId) ?? 0) + qtd)
    }
    const ids = new Set([...totaisAnteriores.keys(), ...totaisNovos.keys()])
    const linhas: { pecaId: number; materialId: number; quantidade: number; unidade: string; custoUnitarioNoConsumo: number }[] = []
    let custoMaterial = 0
    for (const materialId of ids) {
      const material = await db.materiais.get(materialId)
      if (!material) throw new Error(`Material ${materialId} não encontrado.`)
      const novaQtd = totaisNovos.get(materialId) ?? 0
      const diferenca = novaQtd - (totaisAnteriores.get(materialId) ?? 0)
      if (peca.status !== 'cancelada' && diferenca !== 0) {
        if (diferenca > 0) { exigirConexaoEstoque(); exigirEstoque(material, diferenca) }
        await db.materiais.update(materialId, { quantidadeEstoque: material.quantidadeEstoque - diferenca })
      }
      let restante = novaQtd
      for (const anterior of anteriores.filter(c => c.materialId === materialId)) {
        const quantidade = Math.min(restante, anterior.quantidade)
        if (quantidade <= 0) break
        const custo = anterior.custoUnitarioNoConsumo ?? material.custoUnitario
        linhas.push({ pecaId, materialId, quantidade, unidade: material.unidade, custoUnitarioNoConsumo: custo })
        custoMaterial += quantidade * custo
        restante -= quantidade
      }
      if (restante > 0) {
        linhas.push({ pecaId, materialId, quantidade: restante, unidade: material.unidade, custoUnitarioNoConsumo: material.custoUnitario })
        custoMaterial += restante * material.custoUnitario
      }
    }
    const atualizada = { ...peca, ...dados }
    if (peca.usoConfirmadoEm) {
      const normalizarFormas = (p: Pick<Peca, 'formaId' | 'formasAdicionais'>) => JSON.stringify([...formasDaPeca(p)].sort(([a], [b]) => a - b))
      const normalizarEquipamentos = (p: Peca) => {
        const totais = new Map<number, number>()
        for (const uso of p.usosEnergia ?? []) totais.set(uso.equipamentoId, (totais.get(uso.equipamentoId) ?? 0) + uso.minutosUso)
        return JSON.stringify([...totais].sort(([a], [b]) => a - b))
      }
      if (normalizarFormas(peca) !== normalizarFormas(atualizada) || normalizarEquipamentos(peca) !== normalizarEquipamentos(atualizada)) {
        throw new Error('Os moldes e tempos já tiveram uso real confirmado e não podem ser alterados nesta peça.')
      }
    }
    const formasAtuais = formasDaPeca(peca)
    const formasNovas = formasDaPeca(atualizada)
    const custoForma = peca.status === 'cancelada'
      ? await custoFormas(formasNovas)
      : await ajustarUsosFormas(formasAtuais, formasNovas, true)
    const custoPropaganda = atualizada.diasPropaganda && atualizada.diasPropaganda > 0 ? (atualizada.valorPropagandaTotal ?? 0) / atualizada.diasPropaganda : 0
    const custoDesgasteEquipamentos = calcularDesgasteEquipamentos(atualizada.usosEnergia ?? [], await db.equipamentos.toArray()).custo
    const precoVenda = calcularPrecificacao({ custoMaterial, custoAcessorios: (atualizada.custoEpiInsumos ?? 0) + custoPropaganda + (atualizada.valorFrete ?? 0) + (atualizada.custoDesgasteFerramentas ?? 0), horasProducao: atualizada.horasMaoDeObra ?? 0, valorHora: tarifas.valorHoraMaoDeObra || 25, rateioFixoPercent: 0, margemLucroPercent: atualizada.margemDesejada ?? 50, usosEnergia: atualizada.usosEnergia ?? [], tarifaKwh: tarifas.tarifaKwh || 0.85, litrosAgua: atualizada.litrosAgua ?? 0, custoForma, custoDesgasteEquipamentos, percentualTaxas: atualizada.percentualTaxas ?? 0 }).precoFinal
    await db.consumosPeca.where('pecaId').equals(pecaId).delete()
    if (linhas.length) await db.consumosPeca.bulkAdd(linhas)
    // O valor da venda já registrada é histórico; recalcular custos de uma
    // peça vendida não pode alterar o preço usado na operação financeira.
    await db.pecas.update(pecaId, { ...dados, precoVenda: peca.status === 'vendida' ? peca.precoVenda : precoVenda })
    await db.eventosPeca.add({ pecaId, tipo: 'atualizacao_dados', descricao: 'Materiais e dados de produção atualizados', criadoEm: new Date().toISOString() })
  })
}

export const editarConsumosPeca = (...args: Parameters<typeof editarConsumosPecaInterno>): ReturnType<typeof editarConsumosPecaInterno> => transacaoComEstoque(() => editarConsumosPecaInterno(...args))



export const criarPeca = (...args: Parameters<typeof criarPecaInterno>): ReturnType<typeof criarPecaInterno> => transacaoComEstoque(() => criarPecaInterno(...args))

export const atualizarStatusPeca = (...args: Parameters<typeof atualizarStatusPecaInterno>): ReturnType<typeof atualizarStatusPecaInterno> => transacaoComEstoque(() => atualizarStatusPecaInterno(...args))

export const registrarVendaPeca = (...args: Parameters<typeof registrarVendaPecaInterno>): ReturnType<typeof registrarVendaPecaInterno> => transacaoComEstoque(() => registrarVendaPecaInterno(...args))

export const excluirPeca = (...args: Parameters<typeof excluirPecaInterno>): ReturnType<typeof excluirPecaInterno> => transacaoComEstoque(() => excluirPecaInterno(...args))
