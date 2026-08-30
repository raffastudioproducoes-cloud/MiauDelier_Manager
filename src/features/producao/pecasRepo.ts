import { db, type Peca, type EventoPeca } from '../../db/schema'

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

export async function excluirPeca(pecaId: number): Promise<void> {
  await db.transaction('rw', db.pecas, db.consumosPeca, db.eventosPeca, db.materiais, async () => {
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
  })
}
