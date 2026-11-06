import { beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('./estoqueServidor', () => ({ transacaoComEstoque: <T,>(fn: () => Promise<T>) => fn() }))
import { db } from '../../db/schema'
import { criarForma } from './formasRepo'
import { criarEquipamento } from './equipamentosRepo'
import { criarPeca, excluirPeca, atualizarStatusPeca, editarConsumosPeca, registrarVendaPeca } from './pecasRepo'
import { criarPedido, concluirVendaPedido } from '../vendas/pedidosRepo'
import { confirmarUsoRealPeca, obterUsosConfirmados, obterVidaFerramentas } from './vidaUtilRepo'

describe('vida útil confirmada', () => {
  beforeEach(async () => { await db.delete(); await db.open() })
  it('não confunde estimativa com uso confirmado e conserva confirmação ao cancelar e excluir', async () => {
    const formaId = await criarForma({ nome: 'Tampo', geometria: 'direto', dimensoesCm: {}, vidaUtilUsos: 100 })
    const peId = await criarForma({ nome: 'Pé', geometria: 'direto', dimensoesCm: {}, vidaUtilUsos: 80 })
    const eq = await criarEquipamento({ nome: 'Politriz', potenciaWatts: 500, vidaUtilHoras: 100 })
    const id = await criarPeca({ nome: 'Mesa', formaId, formasAdicionais: [{ formaId: peId, quantidade: 4 }], consumos: [], usosEnergia: [{ equipamentoId: eq, nomeEquipamento: 'Politriz', potenciaWatts: 500, minutosUso: 30 }, { equipamentoId: eq, nomeEquipamento: 'Politriz', potenciaWatts: 500, minutosUso: 45 }] })
    expect((await obterUsosConfirmados('forma')).size).toBe(0)
    await confirmarUsoRealPeca(id)
    expect((await obterUsosConfirmados('forma')).get(formaId)).toBe(1)
    expect((await obterUsosConfirmados('forma')).get(peId)).toBe(4)
    expect((await obterUsosConfirmados('equipamento')).get(eq)).toBe(75)
    await expect(confirmarUsoRealPeca(id)).rejects.toThrow(/já foi confirmado/)
    await expect(editarConsumosPeca(id, [], { formasAdicionais: [{ formaId: peId, quantidade: 3 }] })).rejects.toThrow(/uso real confirmado/)
    await atualizarStatusPeca(id, 'cancelada')
    await excluirPeca(id)
    expect((await obterUsosConfirmados('forma')).get(peId)).toBe(4)
    expect((await obterUsosConfirmados('equipamento')).get(eq)).toBe(75)
  })
  it('não duplica eventos em chamadas simultâneas', async () => {
    const formaId = await criarForma({ nome: 'Molde', geometria: 'direto', dimensoesCm: {} })
    const id = await criarPeca({ nome: 'Peça', formaId, consumos: [] })
    const resultados = await Promise.allSettled([confirmarUsoRealPeca(id), confirmarUsoRealPeca(id)])
    expect(resultados.filter(x => x.status === 'fulfilled')).toHaveLength(1)
    expect((await obterUsosConfirmados('forma')).get(formaId)).toBe(1)
  })

  it('registra ferramenta reutilizável sem baixá-la e mantém histórico após exclusão', async () => {
    const formaId = await criarForma({ nome: 'Molde', geometria: 'direto', dimensoesCm: {} })
    const materialId = (await db.materiais.add({ nome: 'Alicate', categoriaId: 1, unidade: 'un', quantidadeEstoque: 1, custoUnitario: 20, tipoClassificacao: 'ferramenta' }))!
    const id = await criarPeca({ nome: 'Peça', formaId, consumos: [] })
    await confirmarUsoRealPeca(id, [{ materialId, quantidade: 2, vidaUtilUsos: 100 }])
    expect((await db.materiais.get(materialId))?.quantidadeEstoque).toBe(1)
    expect((await db.pecas.get(id))?.custoDesgasteFerramentas).toBeCloseTo(0.4)
    expect((await db.pecas.get(id))?.precoVenda).toBeGreaterThan(0.4)
    await db.materiais.update(materialId, { custoUnitario: 80 })
    await editarConsumosPeca(id, [], { nome: 'Peça ajustada' })
    expect((await db.pecas.get(id))?.custoDesgasteFerramentas).toBeCloseTo(0.4)
    await expect(editarConsumosPeca(id, [{ materialId, quantidade: 1 }], {})).rejects.toThrow(/não pode ser adicionada/)
    expect((await obterVidaFerramentas()).get(materialId)).toEqual({ usos: 2, vidaUtilUsos: 100 })
    await excluirPeca(id)
    expect((await obterVidaFerramentas()).get(materialId)).toEqual({ usos: 2, vidaUtilUsos: 100 })
  })
  it.each(['direta', 'pedido'] as const)('não altera o valor financeiro após venda %s ao confirmar ferramentas', async (modo) => {
    const formaId = await criarForma({ nome: 'Molde', geometria: 'direto', dimensoesCm: {} })
    const materialId = (await db.materiais.add({ nome: 'Alicate', categoriaId: 1, unidade: 'un', quantidadeEstoque: 1, custoUnitario: 20, tipoClassificacao: 'ferramenta' }))!
    const id = await criarPeca({ nome: 'Peça', formaId, consumos: [], precoVenda: 100 })
    const conta = (await db.contas.add({ nome: 'Caixa', saldoCriptografado: '0' }))!
    if (modo === 'direta') await registrarVendaPeca(id, 100, conta, 'Venda')
    else {
      const clienteId = (await db.clientes.add({ nome: 'Cliente' }))!
      const pedido = await criarPedido({ clienteId, pecaIds: [id] })
      await concluirVendaPedido(pedido, conta, 100)
      expect((await db.pedidos.get(pedido))?.valorVenda).toBe(100)
    }
    await confirmarUsoRealPeca(id, [{ materialId, quantidade: 2, vidaUtilUsos: 100 }])
    expect((await db.pecas.get(id))?.precoVenda).toBe(100)
    expect((await db.pecas.get(id))?.custoDesgasteFerramentas).toBeCloseTo(0.4)
    expect((await db.transacoes.toArray())[0].valorCriptografado).toBe('100')
    await editarConsumosPeca(id, [], { nome: 'Peça ajustada', precoVenda: 123 })
    expect((await db.pecas.get(id))?.precoVenda).toBe(100)
    expect((await db.transacoes.toArray())[0].valorCriptografado).toBe('100')
    if (modo === 'pedido') expect((await db.pedidos.toArray())[0].valorVenda).toBe(100)
  })
  it('não presume o desgaste de consumíveis ou de unidades indistintas', async () => {
    const formaId = await criarForma({ nome: 'Molde', geometria: 'direto', dimensoesCm: {} })
    const consumivel = (await db.materiais.add({ nome: 'Resina', categoriaId: 1, unidade: 'un', quantidadeEstoque: 1, custoUnitario: 20, tipoClassificacao: 'consumivel' }))!
    const lote = (await db.materiais.add({ nome: 'Alicates', categoriaId: 1, unidade: 'un', quantidadeEstoque: 2, custoUnitario: 20, tipoClassificacao: 'ferramenta' }))!
    const id = await criarPeca({ nome: 'Peça', formaId, consumos: [] })
    await expect(confirmarUsoRealPeca(id, [{ materialId: consumivel, quantidade: 1, vidaUtilUsos: 100 }])).rejects.toThrow(/classificados como ferramenta/)
    await expect(confirmarUsoRealPeca(id, [{ materialId: lote, quantidade: 1, vidaUtilUsos: 100 }])).rejects.toThrow(/individualmente/)
    expect((await db.pecas.get(id))?.usoConfirmadoEm).toBeUndefined()
    expect(await db.registrosVidaUtil.count()).toBe(0)
  })
  it('reconhece ferramenta que herda classificação da categoria pai', async () => {
    const formaId = await criarForma({ nome: 'Molde', geometria: 'direto', dimensoesCm: {} })
    const pai = (await db.categoriasMaterial.add({ nome: 'Ferramentas', tipoClassificacao: 'ferramenta' }))!
    const sub = (await db.categoriasMaterial.add({ nome: 'Manual', categoriaPaiId: pai }))!
    const materialId = (await db.materiais.add({ nome: 'Alicate', categoriaId: pai, subcategoriaId: sub, unidade: 'un', quantidadeEstoque: 1, custoUnitario: 20 }))!
    const id = await criarPeca({ nome: 'Peça', formaId, consumos: [] })
    await confirmarUsoRealPeca(id, [{ materialId, quantidade: 1, vidaUtilUsos: 100 }])
    expect((await obterVidaFerramentas()).get(materialId)?.usos).toBe(1)
  })
})
