vi.mock('./estoqueServidor', () => ({ transacaoComEstoque: <T,>(fn: () => Promise<T>) => fn() }))
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { db } from '../../db/schema'
import { criarForma } from './formasRepo'
import { criarMaterial } from './materiaisRepo'
import {
  criarPeca,
  listarPecas,
  listarEventosDaPeca,
  excluirPeca,
  listarConsumosDaPeca,
  atualizarStatusPeca,
  registrarVendaPeca,
  atualizarPrecoVendaPeca,
  editarConsumosPeca,
} from './pecasRepo'
import { listarMateriais } from './materiaisRepo'
import { criarConta } from '../financeiro/contasRepo'
import { setupAccount, clearSession } from '../../lib/auth'
import { listarAuditoria } from '../auditoria/auditoriaRepo'

describe('repositório de peças', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
    clearSession()
    await setupAccount('senha-do-ateliê')
  })

  it('devolve materiais ao excluir peça mesmo se um molde tiver sido excluído', async () => {
    const formaId = await criarForma({ nome: 'Molde', geometria: 'direto', dimensoesCm: {} })
    const materialId = await criarMaterial({ nome: 'Resina', categoriaId: 1, unidade: 'kg', quantidadeEstoque: 10, custoUnitario: 2 })
    const id = await criarPeca({ nome: 'Mesa', formaId, consumos: [{ materialId, quantidade: 2 }] })
    await db.formas.delete(formaId)
    await excluirPeca(id)
    expect((await db.materiais.get(materialId))?.quantidadeEstoque).toBe(10)
    expect(await db.pecas.get(id)).toBeUndefined()
  })

  it('preserva peça e todos os saldos se material necessário ao estorno estiver ausente', async () => {
    const formaId = await criarForma({ nome: 'Molde', geometria: 'direto', dimensoesCm: {} })
    const a = await criarMaterial({ nome: 'A', categoriaId: 1, unidade: 'kg', quantidadeEstoque: 10, custoUnitario: 2 })
    const b = await criarMaterial({ nome: 'B', categoriaId: 1, unidade: 'kg', quantidadeEstoque: 10, custoUnitario: 2 })
    const id = await criarPeca({ nome: 'Mesa', formaId, consumos: [{ materialId: a, quantidade: 2 }, { materialId: b, quantidade: 3 }] })
    await db.materiais.delete(b)
    await expect(atualizarStatusPeca(id, 'cancelada')).rejects.toThrow(/não encontrado/i)
    await expect(excluirPeca(id)).rejects.toThrow(/não encontrado/i)
    expect((await db.materiais.get(a))?.quantidadeEstoque).toBe(8)
    expect((await db.pecas.get(id))?.status).toBe('planejada')
    expect(await db.consumosPeca.where('pecaId').equals(id).count()).toBe(2)
  })

  it('gera identificadores portáteis distintos e não reutiliza série após exclusão', async () => {
    const formaId = await criarForma({ nome: 'Molde', geometria: 'direto', dimensoesCm: {} })
    const primeiro = await criarPeca({ nome: 'Primeira', formaId, consumos: [] })
    const registroPrimeiro = await db.pecas.get(primeiro)
    expect(registroPrimeiro?.identificadorUnico).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
    expect(registroPrimeiro?.numeroSerie).toMatch(/^#P-[0-9A-Z]{25}$/)
    await excluirPeca(primeiro)
    const segundo = await criarPeca({ nome: 'Segunda', formaId, consumos: [] })
    const registroSegundo = await db.pecas.get(segundo)
    expect(registroSegundo?.identificadorUnico).not.toBe(registroPrimeiro?.identificadorUnico)
    expect(registroSegundo?.numeroSerie).not.toBe(registroPrimeiro?.numeroSerie)
  })

  it('ajusta estoque pela diferença e conserva o custo antigo da quantidade existente', async () => {
    const formaId = await criarForma({ nome: 'Molde', geometria: 'direto', dimensoesCm: {}, volumeDiretoMl: 20 })
    const materialId = await criarMaterial({ nome: 'Resina', categoriaId: 1, unidade: 'kg', quantidadeEstoque: 10, custoUnitario: 100 })
    const id = await criarPeca({ nome: 'Mesa', formaId, consumos: [{ materialId, quantidade: 2 }] })
    await db.materiais.update(materialId, { custoUnitario: 150 })
    await editarConsumosPeca(id, [{ materialId, quantidade: 3, unidade: 'kg' }], {})
    expect((await db.materiais.get(materialId))?.quantidadeEstoque).toBe(7)
    const linhas = await db.consumosPeca.where('pecaId').equals(id).toArray()
    expect(linhas.map(c => [c.quantidade, c.custoUnitarioNoConsumo])).toEqual([[2, 100], [1, 150]])
    expect((await db.pecas.get(id))?.precoVenda).toBe(525)
    await editarConsumosPeca(id, [{ materialId, quantidade: 1, unidade: 'kg' }], {})
    expect((await db.materiais.get(materialId))?.quantidadeEstoque).toBe(9)
    expect((await db.pecas.get(id))?.precoVenda).toBe(150)
    await expect(editarConsumosPeca(id, [{ materialId, quantidade: 20, unidade: 'kg' }], {})).rejects.toThrow(/estoque insuficiente/i)
    expect((await db.materiais.get(materialId))?.quantidadeEstoque).toBe(9)
  })

  it('edita uma peça cancelada sem movimentar o estoque devolvido', async () => {
    const formaId = await criarForma({ nome: 'Molde', geometria: 'direto', dimensoesCm: {} })
    const materialId = await criarMaterial({ nome: 'Resina', categoriaId: 1, unidade: 'kg', quantidadeEstoque: 10, custoUnitario: 100 })
    const id = await criarPeca({ nome: 'Mesa', formaId, consumos: [{ materialId, quantidade: 2 }] })
    await atualizarStatusPeca(id, 'cancelada')
    await editarConsumosPeca(id, [{ materialId, quantidade: 3, unidade: 'kg' }], {})
    expect((await db.materiais.get(materialId))?.quantidadeEstoque).toBe(10)
    await atualizarStatusPeca(id, 'planejada')
    expect((await db.materiais.get(materialId))?.quantidadeEstoque).toBe(7)
  })

  it('não altera nenhum saldo ou consumo se um material estiver insuficiente', async () => {
    const formaId = await criarForma({ nome: 'Molde', geometria: 'direto', dimensoesCm: {} })
    const resina = await criarMaterial({ nome: 'Resina', categoriaId: 1, unidade: 'kg', quantidadeEstoque: 10, custoUnitario: 100 })
    const luva = await criarMaterial({ nome: 'Luva', categoriaId: 1, unidade: 'un', quantidadeEstoque: 1, custoUnitario: 2 })
    const id = await criarPeca({ nome: 'Mesa', formaId, consumos: [{ materialId: resina, quantidade: 2 }] })
    await expect(editarConsumosPeca(id, [{ materialId: resina, quantidade: 3 }, { materialId: luva, quantidade: 2 }], {})).rejects.toThrow(/estoque insuficiente/i)
    expect((await db.materiais.get(resina))?.quantidadeEstoque).toBe(8)
    expect((await db.materiais.get(luva))?.quantidadeEstoque).toBe(1)
    expect((await db.consumosPeca.where('pecaId').equals(id).toArray()).map(c => c.quantidade)).toEqual([2])
  })

  it('atualiza os usos do molde ao trocar a forma da peça', async () => {
    const antiga = await criarForma({ nome: 'Antiga', geometria: 'direto', dimensoesCm: {} })
    const nova = await criarForma({ nome: 'Nova', geometria: 'direto', dimensoesCm: {} })
    const materialId = await criarMaterial({ nome: 'Resina', categoriaId: 1, unidade: 'kg', quantidadeEstoque: 10, custoUnitario: 100 })
    const id = await criarPeca({ nome: 'Mesa', formaId: antiga, consumos: [{ materialId, quantidade: 2 }] })
    await editarConsumosPeca(id, [{ materialId, quantidade: 2, unidade: 'kg' }], { formaId: nova })
    expect((await db.formas.get(antiga))?.usosRealizados).toBe(0)
    expect((await db.formas.get(nova))?.usosRealizados).toBe(1)
    expect((await db.materiais.get(materialId))?.quantidadeEstoque).toBe(8)
  })

  it('cria peça, registra consumo, decrementa estoque e abre evento inicial', async () => {
    const formaId = await criarForma({ nome: 'Chaveiro', geometria: 'direto', dimensoesCm: {}, volumeDiretoMl: 20 })
    const materialId = await criarMaterial({ nome: 'Resina', categoriaId: 1, unidade: 'ml', quantidadeEstoque: 1000, custoUnitario: 0.15 })

    const pecaId = await criarPeca({
      nome: 'Chaveiro gato',
      formaId,
      consumos: [{ materialId, quantidade: 20 }],
    })

    const pecas = await listarPecas()
    expect(pecas).toHaveLength(1)
    expect(pecas[0].status).toBe('planejada')

    const materiais = await db.materiais.toArray()
    expect(materiais[0].quantidadeEstoque).toBe(980)

    const eventos = await listarEventosDaPeca(pecaId)
    expect(eventos).toHaveLength(1)
    expect(eventos[0].tipo).toBe('criacao')
  })

  it('não decrementa estoque se a peça não puder ser criada por completo (atomicidade)', async () => {
    const formaId = await criarForma({ nome: 'X', geometria: 'direto', dimensoesCm: {}, volumeDiretoMl: 10 })
    const materialIdReal = await criarMaterial({ nome: 'Resina', categoriaId: 1, unidade: 'ml', quantidadeEstoque: 100, custoUnitario: 0.1 })
    const materialIdInexistente = materialIdReal + 999

    await expect(
      criarPeca({
        nome: 'Peça quebrada',
        formaId,
        consumos: [
          { materialId: materialIdReal, quantidade: 10 },
          { materialId: materialIdInexistente, quantidade: 5 },
        ],
      }),
    ).rejects.toThrow()

    const materiais = await db.materiais.toArray()
    expect(materiais[0].quantidadeEstoque).toBe(100)
    expect(await listarPecas()).toHaveLength(0)
  })

  it('rejeita consumo maior que o estoque e não grava nada (estoque intacto)', async () => {
    const formaId = await criarForma({ nome: 'Y', geometria: 'direto', dimensoesCm: {}, volumeDiretoMl: 10 })
    const materialId = await criarMaterial({ nome: 'Resina Cristal', categoriaId: 1, unidade: 'ml', quantidadeEstoque: 880, custoUnitario: 0.1 })

    await expect(
      criarPeca({ nome: 'Peça gigante', formaId, consumos: [{ materialId, quantidade: 5000 }] }),
    ).rejects.toThrow(/estoque insuficiente/i)

    const materiais = await db.materiais.toArray()
    expect(materiais[0].quantidadeEstoque).toBe(880)
    expect(await listarPecas()).toHaveLength(0)
    expect(await db.consumosPeca.count()).toBe(0)
  })

  it('rejeita quantidade negativa ou zero em vez de inflar o estoque', async () => {
    const formaId = await criarForma({ nome: 'Z', geometria: 'direto', dimensoesCm: {}, volumeDiretoMl: 10 })
    const materialId = await criarMaterial({ nome: 'Resina', categoriaId: 1, unidade: 'ml', quantidadeEstoque: 500, custoUnitario: 0.1 })

    await expect(
      criarPeca({ nome: 'Peça negativa', formaId, consumos: [{ materialId, quantidade: -5 }] }),
    ).rejects.toThrow(/maior que zero/i)

    await expect(
      criarPeca({ nome: 'Peça zero', formaId, consumos: [{ materialId, quantidade: 0 }] }),
    ).rejects.toThrow(/maior que zero/i)

    const materiais = await db.materiais.toArray()
    expect(materiais[0].quantidadeEstoque).toBe(500)
  })

  it('exclui peça e devolve o material consumido ao estoque', async () => {
    const formaId = await criarForma({ nome: 'Molde', geometria: 'direto', dimensoesCm: {}, volumeDiretoMl: 20 })
    const materialId = await criarMaterial({ nome: 'Resina', categoriaId: 1, unidade: 'ml', quantidadeEstoque: 1000, custoUnitario: 0.1 })
    const pecaId = await criarPeca({ nome: 'Peça', formaId, consumos: [{ materialId, quantidade: 100 }] })

    await excluirPeca(pecaId)

    const materiais = await listarMateriais()
    expect(materiais[0].quantidadeEstoque).toBe(1000)
    expect(await listarPecas()).toHaveLength(0)
    expect(await db.consumosPeca.count()).toBe(0)
    expect(await db.eventosPeca.count()).toBe(0)

    const registros = await listarAuditoria()
    const registro = registros.find((r) => r.entidade === 'peca' && r.entidadeId === pecaId)
    expect(registro).toBeDefined()
  })

  it('atualizarPrecoVendaPeca registra auditoria com preço anterior e novo', async () => {
    const formaId = await criarForma({ nome: 'Molde', geometria: 'direto', dimensoesCm: {}, volumeDiretoMl: 10 })
    const pecaId = await criarPeca({ nome: 'Peça', formaId, consumos: [] })

    await atualizarPrecoVendaPeca(pecaId, 30)
    await atualizarPrecoVendaPeca(pecaId, 45)

    const registros = await listarAuditoria()
    const registro = registros.find((r) => r.entidade === 'peca' && r.entidadeId === pecaId && r.valorNovo === '45')
    expect(registro).toBeDefined()
    expect(registro?.valorAnterior).toBe('30')
  })

  it('lista consumos da peça decorados com o nome do material', async () => {
    const formaId = await criarForma({ nome: 'Molde', geometria: 'direto', dimensoesCm: {}, volumeDiretoMl: 20 })
    const materialId = await criarMaterial({ nome: 'Resina', categoriaId: 1, unidade: 'ml', quantidadeEstoque: 1000, custoUnitario: 0.1 })
    const pecaId = await criarPeca({ nome: 'Peça', formaId, consumos: [{ materialId, quantidade: 100 }] })

    const consumos = await listarConsumosDaPeca(pecaId)
    expect(consumos).toHaveLength(1)
    expect(consumos[0].nomeMaterial).toBe('Resina')
    expect(consumos[0].quantidade).toBe(100)
  })

  it('atualiza status e registra evento no ledger', async () => {
    const formaId = await criarForma({ nome: 'Molde', geometria: 'direto', dimensoesCm: {}, volumeDiretoMl: 10 })
    const pecaId = await criarPeca({ nome: 'Peça', formaId, consumos: [] })

    await atualizarStatusPeca(pecaId, 'em_producao')

    const pecas = await listarPecas()
    expect(pecas[0].status).toBe('em_producao')

    const eventos = await listarEventosDaPeca(pecaId)
    expect(eventos.some((e) => e.tipo === 'mudanca_status')).toBe(true)
  })

  it('registrarVendaPeca marca vendida, salva preço e cria transação em uma única operação', async () => {
    const formaId = await criarForma({ nome: 'Molde', geometria: 'direto', dimensoesCm: {}, volumeDiretoMl: 10 })
    const pecaId = await criarPeca({ nome: 'Peça vendida', formaId, consumos: [] })
    const contaId = await criarConta({ nome: 'Caixa', saldoInicial: 0 })

    await registrarVendaPeca(pecaId, 50, contaId, 'Venda: Peça vendida')

    const pecas = await listarPecas()
    expect(pecas[0].status).toBe('vendida')
    expect(pecas[0].precoVenda).toBe(50)

    const transacoes = await db.transacoes.where('contaId').equals(contaId).toArray()
    expect(transacoes).toHaveLength(1)
    expect(transacoes[0].descricao).toBe('Venda: Peça vendida')

    const eventos = await listarEventosDaPeca(pecaId)
    expect(eventos.some((e) => e.tipo === 'mudanca_status' && e.descricao.includes('vendida'))).toBe(true)

    const registros = await listarAuditoria()
    const registro = registros.find((r) => r.entidade === 'peca' && r.entidadeId === pecaId && r.valorNovo === '50')
    expect(registro).toBeDefined()
  })

  it('registrarVendaPeca não deixa a peça "vendida" órfã se a escrita da transação falhar (atomicidade)', async () => {
    const formaId = await criarForma({ nome: 'Molde', geometria: 'direto', dimensoesCm: {}, volumeDiretoMl: 10 })
    const pecaId = await criarPeca({ nome: 'Peça falha', formaId, consumos: [] })
    const contaId = await criarConta({ nome: 'Caixa', saldoInicial: 0 })

    const addOriginal = db.transacoes.add.bind(db.transacoes)
    const espiao = vi.spyOn(db.transacoes, 'add').mockImplementation(() => {
      throw new Error('falha simulada de gravação (ex.: quota do IndexedDB)')
    })

    await expect(registrarVendaPeca(pecaId, 50, contaId, 'Venda: Peça falha')).rejects.toThrow(/falha simulada/)

    espiao.mockRestore()
    void addOriginal

    const pecas = await listarPecas()
    expect(pecas[0].status).not.toBe('vendida')
    expect(pecas[0].precoVenda).toBeUndefined()

    expect(await db.transacoes.where('contaId').equals(contaId).count()).toBe(0)
    const eventos = await listarEventosDaPeca(pecaId)
    expect(eventos.some((e) => e.tipo === 'mudanca_status')).toBe(false)
  })

  it('cancelar produção devolve materiais ao estoque e estorna uso da forma', async () => {
    const formaId = await criarForma({ nome: 'Molde', geometria: 'direto', dimensoesCm: {}, volumeDiretoMl: 20 })
    const materialId = await criarMaterial({ nome: 'Resina Epóxi', categoriaId: 1, unidade: 'ml', quantidadeEstoque: 1000, custoUnitario: 0.15 })

    const pecaId = await criarPeca({
      nome: 'Peça teste',
      formaId,
      consumos: [{ materialId, quantidade: 200 }],
    })

    // Verifica que debitou estoque (800) e incrementou uso da forma (1)
    let mat = await db.materiais.get(materialId)
    let forma = await db.formas.get(formaId)
    expect(mat?.quantidadeEstoque).toBe(800)
    expect(forma?.usosRealizados).toBe(1)

    // Cancela a produção
    await atualizarStatusPeca(pecaId, 'cancelada')

    // Materiais devem ter retornado ao estoque (1000) e uso da forma estornado (0)
    mat = await db.materiais.get(materialId)
    forma = await db.formas.get(formaId)
    expect(mat?.quantidadeEstoque).toBe(1000)
    expect(forma?.usosRealizados).toBe(0)

    const pecas = await listarPecas()
    expect(pecas[0].status).toBe('cancelada')

    // Excluir peça cancelada NÃO deve duplicar a devolução ao estoque
    await excluirPeca(pecaId)
    mat = await db.materiais.get(materialId)
    expect(mat?.quantidadeEstoque).toBe(1000)
  })

  it('reativar peça cancelada debita o estoque novamente', async () => {
    const formaId = await criarForma({ nome: 'Molde', geometria: 'direto', dimensoesCm: {}, volumeDiretoMl: 20 })
    const materialId = await criarMaterial({ nome: 'Pigmento', categoriaId: 1, unidade: 'ml', quantidadeEstoque: 500, custoUnitario: 0.5 })

    const pecaId = await criarPeca({
      nome: 'Peça pigmentada',
      formaId,
      consumos: [{ materialId, quantidade: 100 }],
    })

    await atualizarStatusPeca(pecaId, 'cancelada')
    let mat = await db.materiais.get(materialId)
    expect(mat?.quantidadeEstoque).toBe(500)

    // Reativa a peça
    await atualizarStatusPeca(pecaId, 'em_producao')
    mat = await db.materiais.get(materialId)
    expect(mat?.quantidadeEstoque).toBe(400)
  })

  it('não reativa peça quando linhas do mesmo material somadas excedem o estoque', async () => {
    const formaId = await criarForma({ nome: 'Molde', geometria: 'direto', dimensoesCm: {}, volumeDiretoMl: 10 })
    const materialId = await criarMaterial({ nome: 'Resina', categoriaId: 1, unidade: 'ml', quantidadeEstoque: 10, custoUnitario: 1 })
    const pecaId = await criarPeca({ nome: 'Mesa', formaId, consumos: [{ materialId, quantidade: 3 }, { materialId, quantidade: 3 }] })
    await atualizarStatusPeca(pecaId, 'cancelada')
    await db.materiais.update(materialId, { quantidadeEstoque: 5 })
    await expect(atualizarStatusPeca(pecaId, 'planejada')).rejects.toThrow(/estoque insuficiente/i)
    expect((await db.materiais.get(materialId))?.quantidadeEstoque).toBe(5)
    expect((await db.pecas.get(pecaId))?.status).toBe('cancelada')
  })

  it('não vende peça cancelada se o material necessário não estiver disponível', async () => {
    const formaId = await criarForma({ nome: 'Molde', geometria: 'direto', dimensoesCm: {}, volumeDiretoMl: 10 })
    const materialId = await criarMaterial({ nome: 'Resina', categoriaId: 1, unidade: 'ml', quantidadeEstoque: 10, custoUnitario: 1 })
    const contaId = await criarConta({ nome: 'Caixa', saldoInicial: 0 })
    const pecaId = await criarPeca({ nome: 'Mesa', formaId, consumos: [{ materialId, quantidade: 6 }] })
    await atualizarStatusPeca(pecaId, 'cancelada')
    await db.materiais.update(materialId, { quantidadeEstoque: 5 })
    await expect(registrarVendaPeca(pecaId, 100, contaId, 'Venda')).rejects.toThrow(/estoque insuficiente/i)
    expect((await db.pecas.get(pecaId))?.status).toBe('cancelada')
    expect(await db.transacoes.count()).toBe(0)
    expect((await db.materiais.get(materialId))?.quantidadeEstoque).toBe(5)
    await db.materiais.update(materialId, { quantidadeEstoque: 6 })
    await registrarVendaPeca(pecaId, 100, contaId, 'Venda')
    expect((await db.materiais.get(materialId))?.quantidadeEstoque).toBe(0)
    expect((await db.pecas.get(pecaId))?.status).toBe('vendida')
    expect(await db.transacoes.count()).toBe(1)
  })

  it('converte unidades compatíveis ao registrar consumo (ex.: 0.2 L desconta 200 ml)', async () => {
    const formaId = await criarForma({ nome: 'Mesa', geometria: 'direto', dimensoesCm: {}, volumeDiretoMl: 200 })
    const materialId = await criarMaterial({ nome: 'Resina Epóxi', categoriaId: 1, unidade: 'ml', quantidadeEstoque: 1000, custoUnitario: 0.15 })

    const pecaId = await criarPeca({
      nome: 'Mesa de Resina',
      formaId,
      consumos: [{ materialId, quantidade: 0.2, unidade: 'l' }],
    })

    const mat = await db.materiais.get(materialId)
    expect(mat?.quantidadeEstoque).toBe(800) // 1000ml - 200ml = 800ml

    const consumos = await listarConsumosDaPeca(pecaId)
    expect(consumos[0].quantidade).toBe(200)
  })

  it('rejeita consumo com unidade incompatível (ex.: kg em material ml)', async () => {
    const formaId = await criarForma({ nome: 'Molde', geometria: 'direto', dimensoesCm: {}, volumeDiretoMl: 10 })
    const materialId = await criarMaterial({ nome: 'Resina Líquida', categoriaId: 1, unidade: 'ml', quantidadeEstoque: 1000, custoUnitario: 0.1 })

    await expect(
      criarPeca({
        nome: 'Peça erro unidade',
        formaId,
        consumos: [{ materialId, quantidade: 1, unidade: 'kg' }],
      }),
    ).rejects.toThrow(/incompatível/i)
  })
})
