import { describe, it, expect, beforeEach } from 'vitest'
import Dexie from 'dexie'
import { db, type Peca } from './schema'

describe('MiauDelierDB schema', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  it('grava e lê um material', async () => {
    const id = await db.materiais.add({
      nome: 'Resina Epóxi Alta Viscosidade',
      categoriaId: 1,
      unidade: 'ml',
      quantidadeEstoque: 1000,
      custoUnitario: 0.15,
    })
    const material = await db.materiais.get(id)
    expect(material?.nome).toBe('Resina Epóxi Alta Viscosidade')
  })

  it('tem todas as tabelas do schema', () => {
    const tabelas = db.tables.map((t) => t.name).sort()
    expect(tabelas).toEqual(
      [
        'auditoria',
        'backups',
        'categoriasMaterial',
        'clientes',
        'configuracoes',
        'consumosPeca',
        'contas',
        'eventosPeca',
        'formas',
        'materiais',
        'mensagensIA',
        'pecas',
        'pedidos',
        'transacoes',
      ].sort(),
    )
  })

  it('permite gravar e ler precoVenda numa peça', async () => {
    const formaId = (await db.formas.add({ nome: 'Molde', geometria: 'direto', dimensoesCm: {}, volumeDiretoMl: 10 })) as number
    const peca_: Peca = {
      nome: 'Peça X',
      formaId,
      status: 'planejada',
      criadaEm: new Date().toISOString(),
      precoVenda: 45.5,
    }
    const pecaId = await db.pecas.add(peca_)
    const peca = await db.pecas.get(pecaId)
    expect(peca).toBeDefined()
    expect(peca!.precoVenda).toBe(45.5)
  })

  it('migração v1→v2 preserva dados existentes e adiciona mensagensIA', async () => {
    await db.close()
    await Dexie.delete('MiauDelierManager')

    const dbV1 = new Dexie('MiauDelierManager')
    dbV1.version(1).stores({
      categoriasMaterial: '++id, nome',
      materiais: '++id, nome, categoriaId',
      formas: '++id, nome, geometria',
      pecas: '++id, nome, formaId, status',
      consumosPeca: '++id, pecaId, materialId',
      eventosPeca: '++id, pecaId, tipo, criadoEm',
      clientes: '++id, nome',
      pedidos: '++id, clienteId, status, *pecaIds',
      transacoes: '++id, contaId, tipo, data',
      contas: '++id, nome',
      configuracoes: '++id, &chave',
      auditoria: '++id, entidade, entidadeId, quando',
      backups: '++id, criadoEm',
    })
    await dbV1.open()
    const materialId = await dbV1.table('materiais').add({
      nome: 'Resina pré-migração',
      categoriaId: 1,
      unidade: 'ml',
      quantidadeEstoque: 500,
      custoUnitario: 0.2,
    })
    dbV1.close()

    await db.open()

    const material = await db.materiais.get(materialId as number)
    expect(material?.nome).toBe('Resina pré-migração')

    const msgId = await db.mensagensIA.add({ papel: 'usuario', texto: 'oi', criadoEm: new Date().toISOString() })
    expect(await db.mensagensIA.get(msgId)).toBeDefined()
  })
})
