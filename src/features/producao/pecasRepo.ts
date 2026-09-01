import { db, type Peca, type EventoPeca, type StatusPeca } from '../../db/schema'
import { cifrarCampo } from '../../lib/camposCifrados'
import { registrarAuditoria } from '../auditoria/auditoriaRepo'

export interface ConsumoComMaterial {
  materialId: number
  quantidade: number
  nomeMaterial: string
}

export interface NovoConsumo {
  materialId: number
  quantidade: number
}

export interface NovaPeca {
  nome: string
  formaId: number
  consumos: NovoConsumo[]
}

export interface PecaComForma extends Peca {
  nomeForma: string
}

export async function criarPeca(nova: NovaPeca): Promise<number> {
  return db.transaction('rw', db.pecas, db.consumosPeca, db.eventosPeca, db.materiais, async () => {
    const agora = new Date().toISOString()
    const pecaId = (await db.pecas.add({
      nome: nova.nome,
      formaId: nova.formaId,
      status: 'planejada',
      criadaEm: agora,
    })) as number

    for (const consumo of nova.consumos) {
      const material = await db.materiais.get(consumo.materialId)
      if (!material) throw new Error(`material ${consumo.materialId} não encontrado`)
      if (!Number.isFinite(consumo.quantidade) || consumo.quantidade <= 0) {
        throw new Error(`Quantidade consumida de "${material.nome}" precisa ser maior que zero.`)
      }
      if (consumo.quantidade > material.quantidadeEstoque) {
        throw new Error(
          `Estoque insuficiente de "${material.nome}": disponível ${material.quantidadeEstoque}, solicitado ${consumo.quantidade}`,
        )
      }

      await db.consumosPeca.add({ pecaId, materialId: consumo.materialId, quantidade: consumo.quantidade })
      await db.materiais.update(consumo.materialId, {
        quantidadeEstoque: material.quantidadeEstoque - consumo.quantidade,
      })
    }

    await db.eventosPeca.add({
      pecaId,
      tipo: 'criacao',
      descricao: 'Peça criada e consumo de material registrado',
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
      return { materialId: consumo.materialId, quantidade: consumo.quantidade, nomeMaterial: material?.nome ?? '—' }
    }),
  )
}

export async function atualizarStatusPeca(pecaId: number, novoStatus: StatusPeca): Promise<void> {
  await db.transaction('rw', db.pecas, db.eventosPeca, async () => {
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
  // WebCrypto (cifrarCampo) doesn't need to run inside the Dexie transaction — only the writes do.
  const valorCriptografado = await cifrarCampo(precoVenda.toString())
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
    await registrarAuditoria('peca', pecaId, undefined, precoVenda.toString())
  })
}

export async function excluirPeca(pecaId: number): Promise<void> {
  await db.transaction('rw', db.pecas, db.consumosPeca, db.eventosPeca, db.materiais, db.auditoria, async () => {
    const consumos = await db.consumosPeca.where('pecaId').equals(pecaId).toArray()
    for (const consumo of consumos) {
      const material = await db.materiais.get(consumo.materialId)
      if (material) {
        await db.materiais.update(consumo.materialId, { quantidadeEstoque: material.quantidadeEstoque + consumo.quantidade })
      }
    }
    await db.consumosPeca.where('pecaId').equals(pecaId).delete()
    await db.eventosPeca.where('pecaId').equals(pecaId).delete()
    await db.pecas.delete(pecaId)
    await registrarAuditoria('peca', pecaId)
  })
}
