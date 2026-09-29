import { describe, it, expect, beforeEach } from 'vitest'
import Dexie from 'dexie'
import { db } from '../../src/db/schema'

// ---------------------------------------------------------------------------
// Teste de migração de schema com banco populado
//
// Fluxo:
//  1. Zera o banco IndexedDB real (via fake-indexeddb, configurado em
//     vitest.setup.ts) e abre somente a versão 1 do schema — sem as tabelas
//     introduzidas pelas versões 2-5.
//  2. Popula o banco com dados reais e significativos (múltiplas tabelas e
//     múltiplos registros por tabela).
//  3.Fecha a conexão v1 e abre a conexão oficial do app (MiauDelierDB,
//     versões 1-5). Como o banco já existe na versão 1, o Dexie roda a
//     migração aditiva 1→2→3→4→5 automaticamente.
//  4. Verifica integridade: dados v1 preservados, novas tabelas v2+ acessíveis
//     e com os índices declarados.
// ---------------------------------------------------------------------------

const V1_DB_NAME = 'MiauDelierManager'

describe('schema migration — banco populado v1 → migração aditiva v2+', () => {
  beforeEach(async () => {
    // Garante um estado limpo antes de cada teste.
    await Dexie.delete(V1_DB_NAME).catch(() => {})
    await db.delete().catch(() => {})
  })

  // ------------------------------------------------------------------
  // Helpers
  // ------------------------------------------------------------------

  /** Cria um Dexie na versão 1 com APENAS as tabelas originais (sem v2-v5). */
  function createV1Db(): Dexie {
    const v1 = new Dexie(V1_DB_NAME)
    v1.version(1).stores({
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
    return v1
  }

  /** Popula o banco v1 com dados realistas e retorna os ids criados. */
  async function populaV1(v1: Dexie) {
    const catIds = await Promise.all([
      v1.table('categoriasMaterial').add({ nome: 'Resinas' }),
      v1.table('categoriasMaterial').add({ nome: 'Fibreiras' }),
      v1.table('categoriasMaterial').add({ nome: 'Pinturas' }),
    ])

    const materialIds = await Promise.all([
      v1.table('materiais').add({
        nome: 'Resina Epoxi 100ml',
        categoriaId: catIds[0] as number,
        unidade: 'ml',
        quantidadeEstoque: 500,
        custoUnitario: 12.5,
      }),
      v1.table('materiais').add({
        nome: 'Fibra de Vidro Layout',
        categoriaId: catIds[1] as number,
        unidade: 'm²',
        quantidadeEstoque: 200,
        custoUnitario: 8.0,
      }),
    ])

    const formaId = (await v1.table('formas').add({
      nome: 'Bacia Retangular 20x30',
      geometria: 'retangular',
      dimensoesCm: { comprimento: 20, largura: 30, profundidade: 8 },
      volumeDiretoMl: 4800,
    })) as number

    const pecaId = (await v1.table('pecas').add({
      nome: 'Banheira Personalizada 200L',
      formaId,
      status: 'planejada',
      criadaEm: new Date().toISOString(),
      precoVenda: 1850,
    })) as number

    await v1.table('consumosPeca').add({
      pecaId,
      materialId: materialIds[0] as number,
      quantidade: 3.5,
      unidade: 'ml',
    })
    await v1.table('consumosPeca').add({
      pecaId,
      materialId: materialIds[1] as number,
      quantidade: 2.0,
      unidade: 'm²',
    })

    const eventoId = await v1.table('eventosPeca').add({
      pecaId,
      tipo: 'criacao',
      descricao: 'Peça criada pelo operador',
      criadoEm: new Date().toISOString(),
    })

    const clienteId = (await v1.table('clientes').add({
      nome: 'Alex Delícias',
      contato: 'alex@delicios.com.br',
    })) as number

    const pedidoId = (await v1.table('pedidos').add({
      clienteId,
      pecaIds: [pecaId],
      status: 'aberto',
      criadoEm: new Date().toISOString(),
      prazoEntrega: new Date(Date.now() + 7 * 86400_000).toISOString(),
    })) as number

    const contaId = (await v1.table('contas').add({
      nome: 'Conta Principal',
      saldoCriptografado: 'AQIDBA==',
    })) as number

    await v1.table('transacoes').add({
      contaId,
      tipo: 'entrada',
      valorCriptografado: 'AAAAAA==',
      descricao: 'Depósito inicial',
      data: new Date().toISOString(),
    })

    await v1.table('configuracoes').add({ chave: 'tema', valor: 'escuro' })
    await v1.table('configuracoes').add({ chave: 'moeda', valor: 'BRL' })

    await v1.table('auditoria').add({
      entidade: 'peca',
      entidadeId: pecaId,
      quem: 'admin@miaudelier.local',
      quando: new Date().toISOString(),
      acao: 'criacao',
    })

    await v1.table('backups').add({
      criadoEm: new Date().toISOString(),
      checksum: 'sha256:abc123',
      tamanhoBytes: 1048576,
    })

    return {
      catIds,
      materialIds,
      formaId,
      pecaId,
      eventoId,
      clienteId,
      pedidoId,
      contaId,
    }
  }

  // ------------------------------------------------------------------
  // Testes
  // ------------------------------------------------------------------

  it('preserva todos os dados v1 após a migração aditiva 1→2+ e expõe tabelas novas', async () => {
    // 1. Cria banco v1 e popula.
    const v1 = createV1Db()
    await v1.open()
    const seeds = await populaV1(v1)
    v1.close()

    // 2. Abre a conexão oficial do app — o Dexie detecta que o banco existe
    //    na versão 1 e aplica as versões 2, 3, 4 e 5 em ordem.
    await db.open()

    // 3. Verifica integridade dos dados v1.
    const material = await db.materiais.get(seeds.materialIds[0] as number)
    expect(material).toBeDefined()
    expect(material?.nome).toBe('Resina Epoxi 100ml')
    expect(material?.quantidadeEstoque).toBe(500)

    const forma = await db.formas.get(seeds.formaId)
    expect(forma).toBeDefined()
    expect(forma?.nome).toBe('Bacia Retangular 20x30')
    expect(forma?.geometria).toBe('retangular')

    const peca = await db.pecas.get(seeds.pecaId)
    expect(peca).toBeDefined()
    expect(peca?.nome).toBe('Banheira Personalizada 200L')
    expect(peca?.status).toBe('planejada')
    expect(peca?.precoVenda).toBe(1850)

    const cliente = await db.clientes.get(seeds.clienteId)
    expect(cliente?.nome).toBe('Alex Delícias')

    const pedido = await db.pedidos.get(seeds.pedidoId)
    expect(pedido).toBeDefined()
    expect(pedido?.status).toBe('aberto')

    const conta = await db.contas.get(seeds.contaId)
    expect(conta?.nome).toBe('Conta Principal')

    const transacao = await db.transacoes.where('contaId').equals(seeds.contaId).first()
    expect(transacao).toBeDefined()
    expect(transacao?.tipo).toBe('entrada')

    const configs = await db.configuracoes.toArray()
    expect(configs.some((c) => c.chave === 'tema' && c.valor === 'escuro')).toBe(true)
    expect(configs.some((c) => c.chave === 'moeda' && c.valor === 'BRL')).toBe(true)

    const auditoria = await db.auditoria.where('entidadeId').equals(seeds.pecaId).first()
    expect(auditoria).toBeDefined()
    expect(auditoria?.acao).toBe('criacao')

    // 4. Verifica tabelas introduzidas pelas versões 2-5.
    //    v2: mensagensIA
    const msgId = await db.mensagensIA.add({
      papel: 'usuario',
      texto: 'Olá, assistente.',
      criadoEm: new Date().toISOString(),
    })
    const msg = await db.mensagensIA.get(msgId)
    expect(msg).toBeDefined()
    expect(msg?.papel).toBe('usuario')
    expect(msg?.texto).toBe('Olá, assistente.')

    //    v3: notificacoes, equipamentos, taxas
    const notifId = await db.notificacoes.add({
      titulo: 'Prazo atingido',
      mensagem: 'Entregue na hora',
      lida: false,
      criadoEm: new Date().toISOString(),
    })
    const notif = await db.notificacoes.get(notifId)
    expect(notif).toBeDefined()
    expect(notif?.lida).toBe(false)

    const equipId = await db.equipamentos.add({
      nome: 'Serigrafia 200W',
      potenciaWatts: 200,
      criadoEm: new Date().toISOString(),
    })
    const equip = await db.equipamentos.get(equipId)
    expect(equip?.nome).toBe('Serigrafia 200W')

    const taxaId = await db.taxas.add({
      nome: 'Taxa de serviço',
      percentual: 5,
      valorFixo: 10,
      criadoEm: new Date().toISOString(),
    })
    const taxa = await db.taxas.get(taxaId)
    expect(taxa?.percentual).toBe(5)

    //    v4: categoriasMaterial com categoriaPaiId, materiais com subcategoriaId
    await db.categoriasMaterial.add({
      nome: 'Subcategoria Teste',
      categoriaPaiId: seeds.catIds[0] as number,
    })
    const subCat = await db.categoriasMaterial
      .where('categoriaPaiId')
      .equals(seeds.catIds[0] as number)
      .first()
    expect(subCat).toBeDefined()
    expect(subCat?.nome).toBe('Subcategoria Teste')

    await db.materiais.add({
      nome: 'Material com subcategoria',
      categoriaId: seeds.catIds[0] as number,
      subcategoriaId: 999,
      unidade: 'kg',
      quantidadeEstoque: 10,
      custoUnitario: 50,
    })
    const matSub = await db.materiais.where('subcategoriaId').equals(999).first()
    expect(matSub).toBeDefined()

    //    v5: logs
    await db.logs.add({
      timestamp: new Date().toISOString(),
      nivel: 'info',
      origem: 'test',
      mensagem: 'Migração verificada',
    })
    const log = await db.logs.where('nivel').equals('info').first()
    expect(log).toBeDefined()
    expect(log?.mensagem).toBe('Migração verificada')

    // 5. Verifica que o índice aditivo da v2 (mensagensIA por criadoEm) funciona.
    const recentes = await db.mensagensIA.orderBy('criadoEm').reverse().toArray()
    expect(recentes.length).toBeGreaterThanOrEqual(1)
    expect(recentes[0]?.texto).toBe('Olá, assistente.')
  })

  it('tem todas as tabelas do schema final após migração', async () => {
    await db.open()
    await db.mensagensIA.add({ papel: 'usuario', texto: 'x', criadoEm: new Date().toISOString() })
    await db.notificacoes.add({ titulo: 'T', mensagem: 'M', lida: false, criadoEm: new Date().toISOString() })
    await db.equipamentos.add({ nome: 'E', potenciaWatts: 1, criadoEm: new Date().toISOString() })
    await db.taxas.add({ nome: 'T', percentual: 0, valorFixo: 0, criadoEm: new Date().toISOString() })
    await db.logs.add({ timestamp: new Date().toISOString(), nivel: 'info', origem: 't', mensagem: 'm' })

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
        'equipamentos',
        'eventosPeca',
        'formas',
        'logs',
        'materiais',
        'mensagensIA',
        'notificacoes',
        'pecas',
        'pedidos',
        'syncMetadata',
        'syncQueue',
        'taxas',
        'transacoes',
      ].sort(),
    )
  })
})
