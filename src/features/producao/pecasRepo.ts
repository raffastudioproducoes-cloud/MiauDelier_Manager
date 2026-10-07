import { db, type Peca, type EventoPeca, type StatusPeca } from '../../db/schema'
import { registrarAuditoria } from '../auditoria/auditoriaRepo'
import { converterQuantidade, ehIncompativel } from '../../lib/unidades'

export interface ConsumoComMaterial {
  materialId: number
  quantidade: number
  nomeMaterial: string
  unidade?: string
}

export interface NovoConsumo {
  materialId: number
  quantidade: number
  unidade?: string
}

export interface NovaPeca {
  nome: string
  formaId: number
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

export async function criarPeca(nova: NovaPeca): Promise<number> {
  return db.transaction('rw', db.pecas, db.consumosPeca, db.eventosPeca, db.materiais, db.formas, async () => {
    const agora = new Date().toISOString()
    const totalExistente = await db.pecas.count()
    const numeroSerie = `#${String(totalExistente + 1).padStart(4, '0')}`

    const pecaId = (await db.pecas.add({
      numeroSerie,
      nome: nova.nome,
      formaId: nova.formaId,
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

      if (quantidadeConvertida > material.quantidadeEstoque) {
        const descSolicitada =
          unidadeDigita !== material.unidade
            ? `${consumo.quantidade} ${unidadeDigita} (${quantidadeConvertida} ${material.unidade})`
            : `${quantidadeConvertida} ${material.unidade}`
        throw new Error(
          `Estoque insuficiente de "${material.nome}": disponível ${material.quantidadeEstoque} ${material.unidade}, solicitado ${descSolicitada}`,
        )
      }

      await db.consumosPeca.add({
        pecaId,
        materialId: consumo.materialId,
        quantidade: quantidadeConvertida,
        unidade: unidadeDigita,
      })
      await db.materiais.update(consumo.materialId, {
        quantidadeEstoque: material.quantidadeEstoque - quantidadeConvertida,
      })
    }

    let detalheMolde = ''
    if (nova.formaId) {
      const forma = await db.formas.get(nova.formaId)
      if (forma && forma.id !== undefined) {
        const novosUsos = (forma.usosRealizados ?? 0) + 1
        await db.formas.update(forma.id, { usosRealizados: novosUsos })
        if (forma.custoFabricacao && forma.vidaUtilUsos && forma.vidaUtilUsos > 0) {
          const custoUso = (forma.custoFabricacao / forma.vidaUtilUsos).toFixed(2)
          detalheMolde = ` (uso #${novosUsos} do molde "${forma.nome}", amortização: R$ ${custoUso})`
        } else {
          detalheMolde = ` (uso #${novosUsos} do molde "${forma.nome}")`
        }
      }
    }


    await db.eventosPeca.add({
      pecaId,
      tipo: 'criacao',
      descricao: `Peça criada e consumo de material registrado${detalheMolde}`,
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
      const unidadeExibida = consumo.unidade || material?.unidade || ''
      return {
        materialId: consumo.materialId,
        quantidade: consumo.quantidade,
        nomeMaterial: material?.nome ?? '—',
        unidade: unidadeExibida,
      }
    }),
  )
}

export async function atualizarStatusPeca(pecaId: number, novoStatus: StatusPeca): Promise<void> {
  await db.transaction('rw', [db.pecas, db.consumosPeca, db.eventosPeca, db.materiais, db.formas], async () => {
    const peca = await db.pecas.get(pecaId)
    if (!peca) throw new Error(`Peça ${pecaId} não encontrada`)

    const statusAnterior = peca.status
    if (statusAnterior === novoStatus) return

    // Se transicionando PARA 'cancelada' (e antes não era cancelada): devolve material ao estoque e estorna o uso da forma
    if (novoStatus === 'cancelada' && statusAnterior !== 'cancelada') {
      const consumos = await db.consumosPeca.where('pecaId').equals(pecaId).toArray()
      for (const consumo of consumos) {
        const material = await db.materiais.get(consumo.materialId)
        if (material) {
          await db.materiais.update(consumo.materialId, {
            quantidadeEstoque: material.quantidadeEstoque + consumo.quantidade,
          })
        }
      }
      if (peca.formaId) {
        const forma = await db.formas.get(peca.formaId)
        if (forma && forma.id !== undefined && (forma.usosRealizados ?? 0) > 0) {
          await db.formas.update(forma.id, { usosRealizados: (forma.usosRealizados ?? 1) - 1 })
        }
      }
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
      for (const consumo of consumos) {
        const material = await db.materiais.get(consumo.materialId)
        if (!material) throw new Error(`Material ${consumo.materialId} não encontrado`)
        if (material.quantidadeEstoque < consumo.quantidade) {
          throw new Error(
            `Estoque insuficiente de "${material.nome}" para reativar a produção: disponível ${material.quantidadeEstoque}, necessário ${consumo.quantidade}`,
          )
        }
      }
      for (const consumo of consumos) {
        const material = (await db.materiais.get(consumo.materialId))!
        await db.materiais.update(consumo.materialId, {
          quantidadeEstoque: material.quantidadeEstoque - consumo.quantidade,
        })
      }
      if (peca.formaId) {
        const forma = await db.formas.get(peca.formaId)
        if (forma && forma.id !== undefined) {
          await db.formas.update(forma.id, { usosRealizados: (forma.usosRealizados ?? 0) + 1 })
        }
      }
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
}

export async function registrarVendaPeca(
  pecaId: number,
  precoVenda: number,
  contaId: number,
  descricaoTransacao: string,
): Promise<void> {
  const valorCriptografado = precoVenda.toString()
  const agora = new Date().toISOString()

  await db.transaction('rw', db.pecas, db.eventosPeca, db.contas, db.transacoes, db.auditoria, async () => {
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

export async function excluirPeca(pecaId: number): Promise<void> {
  await db.transaction('rw', [db.pecas, db.consumosPeca, db.eventosPeca, db.materiais, db.formas, db.auditoria], async () => {
    const peca = await db.pecas.get(pecaId)
    // Se a peça NÃO estava cancelada, devolve o material ao estoque e estorna o uso do molde
    if (peca && peca.status !== 'cancelada') {
      const consumos = await db.consumosPeca.where('pecaId').equals(pecaId).toArray()
      for (const consumo of consumos) {
        const material = await db.materiais.get(consumo.materialId)
        if (material) {
          await db.materiais.update(consumo.materialId, {
            quantidadeEstoque: material.quantidadeEstoque + consumo.quantidade,
          })
        }
      }
      if (peca.formaId) {
        const forma = await db.formas.get(peca.formaId)
        if (forma && forma.id !== undefined && (forma.usosRealizados ?? 0) > 0) {
          await db.formas.update(forma.id, { usosRealizados: (forma.usosRealizados ?? 1) - 1 })
        }
      }
    }
    await db.consumosPeca.where('pecaId').equals(pecaId).delete()
    await db.eventosPeca.where('pecaId').equals(pecaId).delete()
    await db.pecas.delete(pecaId)
    await registrarAuditoria('peca', pecaId, 'exclusao')
  })
}

export async function atualizarImagemPeca(pecaId: number, imagemUrl?: string): Promise<void> {
  await db.pecas.update(pecaId, { imagemUrl })
}

export async function atualizarDadosProducaoPeca(pecaId: number, dados: Partial<Peca>): Promise<void> {
  await db.pecas.update(pecaId, dados)
  await db.eventosPeca.add({
    pecaId,
    tipo: 'atualizacao_dados',
    descricao: 'Etapas e dados técnicos de produção/precificação da peça atualizados',
    criadoEm: new Date().toISOString(),
  })
}


