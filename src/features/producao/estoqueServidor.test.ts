import { beforeEach, describe, expect, it, vi } from 'vitest'

const { rpc, getPerfilAtivo } = vi.hoisted(() => ({ rpc: vi.fn(), getPerfilAtivo: vi.fn() }))
vi.mock('../../lib/supabase', () => ({ supabase: { rpc } }))
vi.mock('../../lib/perfisRepo', () => ({ getPerfilAtivo }))
import { confirmarMovimentosEstoque } from './estoqueServidor'
import { db } from '../../db/schema'
import { criarForma } from './formasRepo'
import { criarPeca, atualizarStatusPeca, editarConsumosPeca } from './pecasRepo'
import { reporEstoqueMaterial } from './materiaisRepo'

describe('confirmação de estoque no servidor', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    getPerfilAtivo.mockResolvedValue({ supabaseId: 12 })
  })

  it('envia o perfil e a operação e devolve os saldos confirmados', async () => {
    rpc.mockResolvedValue({ data: [{ materialId: '3', saldo: 8 }], error: null })
    expect(await confirmarMovimentosEstoque('operação', [{ materialId: 3, diferenca: -2 }])).toEqual(new Map([[3, 8]]))
    expect(rpc).toHaveBeenCalledWith('movimentar_estoque_atomico', {
      p_perfil_id: 12, p_operacao_id: 'operação', p_movimentos: [{ materialId: 3, diferenca: -2 }],
    })
  })

  it('não aceita uma resposta que não corresponde aos materiais solicitados', async () => {
    rpc.mockResolvedValue({ data: [{ materialId: '4', saldo: 8 }], error: null })
    await expect(confirmarMovimentosEstoque('operação', [{ materialId: 3, diferenca: -2 }])).rejects.toThrow('Resposta inválida')
  })

  it('propaga erro do servidor sem autorizar a baixa', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'Estoque insuficiente' } })
    await expect(confirmarMovimentosEstoque('operação', [{ materialId: 3, diferenca: -20 }])).rejects.toThrow('Estoque insuficiente')
  })
})

describe('salvamento de molde com confirmação no servidor', () => {
  beforeEach(async () => {
    vi.resetAllMocks()
    getPerfilAtivo.mockResolvedValue({ supabaseId: 12 })
    await db.delete()
    await db.open()
  })

  it('debita a quantidade usada e grava o saldo confirmado', async () => {
    const materialId = await db.materiais.add({ nome: 'Silicone', categoriaId: 1, unidade: 'kg', quantidadeEstoque: 10, custoUnitario: 100 })
    rpc.mockResolvedValue({ data: [{ materialId: String(materialId), saldo: 8 }], error: null })
    await criarForma({ nome: 'Mesa', geometria: 'direto', dimensoesCm: {}, materialSiliconeId: materialId, quantidadeSiliconeUsada: 2, vidaUtilUsos: 100 })
    expect(rpc).toHaveBeenCalledOnce()
    expect((await db.materiais.get(materialId))?.quantidadeEstoque).toBe(8)
    expect(await db.formas.count()).toBe(1)
  })

  it('cancela o cadastro local se o servidor recusar a baixa', async () => {
    const materialId = await db.materiais.add({ nome: 'Silicone', categoriaId: 1, unidade: 'kg', quantidadeEstoque: 10, custoUnitario: 100 })
    rpc.mockResolvedValue({ data: null, error: { message: 'Estoque insuficiente' } })
    await expect(criarForma({ nome: 'Mesa', geometria: 'direto', dimensoesCm: {}, materialSiliconeId: materialId, quantidadeSiliconeUsada: 2, vidaUtilUsos: 100 })).rejects.toThrow('Estoque insuficiente')
    expect((await db.materiais.get(materialId))?.quantidadeEstoque).toBe(10)
    expect(await db.formas.count()).toBe(0)
  })

  it('confirma consumo, devolução e reposição no servidor', async () => {
    const materialId = (await db.materiais.add({ nome: 'Resina', categoriaId: 1, unidade: 'kg', quantidadeEstoque: 10, custoUnitario: 100 }))!
    rpc.mockResolvedValueOnce({ data: [{ materialId: String(materialId), saldo: 8 }], error: null })
    const pecaId = await criarPeca({ nome: 'Peça', formaId: 0, consumos: [{ materialId, quantidade: 2 }] })
    expect((await db.materiais.get(materialId))?.quantidadeEstoque).toBe(8)
    rpc.mockResolvedValueOnce({ data: [{ materialId: String(materialId), saldo: 10 }], error: null })
    await atualizarStatusPeca(pecaId, 'cancelada')
    expect((await db.materiais.get(materialId))?.quantidadeEstoque).toBe(10)
    rpc.mockResolvedValueOnce({ data: [{ materialId: String(materialId), saldo: 15 }], error: null })
    await reporEstoqueMaterial(materialId, 5)
    expect((await db.materiais.get(materialId))?.quantidadeEstoque).toBe(15)
    expect(rpc).toHaveBeenCalledTimes(3)
  })

  it('envia somente a diferença de estoque ao editar a peça', async () => {
    const formaId = await criarForma({ nome: 'Molde', geometria: 'direto', dimensoesCm: {} })
    const materialId = (await db.materiais.add({ nome: 'Resina', categoriaId: 1, unidade: 'kg', quantidadeEstoque: 10, custoUnitario: 100 }))!
    rpc.mockResolvedValueOnce({ data: [{ materialId: String(materialId), saldo: 8 }], error: null })
    const pecaId = await criarPeca({ nome: 'Mesa', formaId, consumos: [{ materialId, quantidade: 2 }] })
    rpc.mockResolvedValueOnce({ data: [{ materialId: String(materialId), saldo: 7 }], error: null })
    await editarConsumosPeca(pecaId, [{ materialId, quantidade: 3, unidade: 'kg' }], {})
    expect(rpc).toHaveBeenLastCalledWith('movimentar_estoque_atomico', expect.objectContaining({ p_movimentos: [{ materialId, diferenca: -1 }] }))
    rpc.mockResolvedValueOnce({ data: [{ materialId: String(materialId), saldo: 9 }], error: null })
    await editarConsumosPeca(pecaId, [{ materialId, quantidade: 1, unidade: 'kg' }], {})
    expect(rpc).toHaveBeenLastCalledWith('movimentar_estoque_atomico', expect.objectContaining({ p_movimentos: [{ materialId, diferenca: 2 }] }))
    expect((await db.materiais.get(materialId))?.quantidadeEstoque).toBe(9)
  })
})
