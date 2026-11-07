import { beforeEach, describe, expect, it, vi } from 'vitest'

const { rpc, getPerfilAtivo, inserir } = vi.hoisted(() => ({ rpc: vi.fn(), getPerfilAtivo: vi.fn(), inserir: vi.fn() }))
vi.mock('../../lib/supabase', () => ({ supabase: { rpc, from: () => ({ insert: inserir }) } }))
vi.mock('../../lib/perfisRepo', () => ({ getPerfilAtivo }))
import { confirmarMovimentosEstoque, recuperarPendenciaEstoque } from './estoqueServidor'
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

  it('repete com o mesmo identificador quando a resposta de rede é perdida', async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { message: 'Failed to fetch' }, status: 0 })
    rpc.mockResolvedValueOnce({ data: [{ materialId: '3', saldo: 8 }], error: null, status: 200 })
    expect(await confirmarMovimentosEstoque('mesma-operação', [{ materialId: 3, diferenca: -2 }])).toEqual(new Map([[3, 8]]))
    expect(rpc).toHaveBeenCalledTimes(2)
    expect(rpc.mock.calls[0][1]).toEqual(rpc.mock.calls[1][1])
  })

  it('avisa que o resultado é incerto se as duas tentativas de rede falharem', async () => {
    rpc.mockRejectedValue(new TypeError('fetch failed'))
    await expect(confirmarMovimentosEstoque('mesma-operação', [{ materialId: 3, diferenca: -2 }])).rejects.toThrow(/confira o saldo e a peça/i)
    expect(rpc).toHaveBeenCalledTimes(2)
    expect(rpc.mock.calls[0][1]).toEqual(rpc.mock.calls[1][1])
  })
})

describe('salvamento de molde com confirmação no servidor', () => {
  beforeEach(async () => {
    vi.resetAllMocks()
    getPerfilAtivo.mockResolvedValue({ supabaseId: 12 })
    localStorage.clear()
    Object.defineProperty(navigator, 'locks', { configurable: true, value: { request: async (_name: string, callback: () => Promise<unknown>) => callback() } })
    await db.delete()
    await db.open()
  })

  it('recusa baixa se o navegador não oferece trava entre abas', async () => {
    Object.defineProperty(navigator, 'locks', { configurable: true, value: undefined })
    const materialId = (await db.materiais.add({ nome: 'Resina', categoriaId: 1, unidade: 'kg', quantidadeEstoque: 10, custoUnitario: 10 }))!
    const formaId = await criarForma({ nome: 'Molde', geometria: 'direto', dimensoesCm: {} })
    await expect(criarPeca({ nome: 'Peça', formaId, consumos: [{ materialId, quantidade: 2 }] })).rejects.toThrow(/bloqueio seguro entre abas/i)
    expect(rpc).not.toHaveBeenCalled()
    expect(await db.pecas.count()).toBe(0)
  })

  it('reconcilia uma resposta perdida antes de permitir outra baixa', async () => {
    const materialId = (await db.materiais.add({ nome: 'Resina', categoriaId: 1, unidade: 'kg', quantidadeEstoque: 10, custoUnitario: 10 }))!
    const formaId = await criarForma({ nome: 'Molde', geometria: 'direto', dimensoesCm: {} })
    rpc.mockRejectedValue(new TypeError('rede indisponível'))
    await expect(criarPeca({ nome: 'Peça', formaId, consumos: [{ materialId, quantidade: 2 }] })).rejects.toThrow(/confira o saldo e a peça/i)
    const pendente = JSON.parse(localStorage.getItem(`miaudelier_estoque_pendente:${db.name}`)!)
    expect(await db.pecas.count()).toBe(0)
    rpc.mockReset()
    rpc.mockResolvedValueOnce({ data: { estado: 'estornada', saldos: [{ materialId, saldo: 10 }] }, error: null })
    rpc.mockResolvedValueOnce({ data: [{ materialId, saldo: 8 }], error: null })
    await criarPeca({ nome: 'Peça', formaId, consumos: [{ materialId, quantidade: 2 }] })
    expect(rpc.mock.calls[0]).toEqual(['recuperar_movimentacao_estoque', expect.objectContaining({ p_operacao_id: pendente.operacaoId, p_reversao_id: pendente.reversaoId })])
    expect((await db.materiais.get(materialId))?.quantidadeEstoque).toBe(8)
    expect(localStorage.getItem(`miaudelier_estoque_pendente:${db.name}`)).toBeNull()
  })

  it('não estorna remotamente uma operação cuja transação local foi confirmada', async () => {
    const pendente = { operacaoId: 'op-concluida', reversaoId: 'reversao', perfilId: 12, movimentos: [{ materialId: 1, diferenca: -2 }] }
    localStorage.setItem(`miaudelier_estoque_pendente:${db.name}`, JSON.stringify(pendente))
    await db.syncMetadata.add({ chave: 'estoque_confirmado:op-concluida', valor: 'confirmado' })
    await recuperarPendenciaEstoque()
    expect(rpc).not.toHaveBeenCalled()
    expect(localStorage.getItem(`miaudelier_estoque_pendente:${db.name}`)).toBeNull()
  })

  it('mantém a operação pendente quando o saldo posterior impede o estorno', async () => {
    const chave = `miaudelier_estoque_pendente:${db.name}`
    const pendente = { operacaoId: 'entrada', reversaoId: 'reversao', perfilId: 12, movimentos: [{ materialId: 1, diferenca: 10 }] }
    localStorage.setItem(chave, JSON.stringify(pendente))
    rpc.mockResolvedValue({ data: null, error: { message: 'Estoque insuficiente para material 1' } })
    await expect(recuperarPendenciaEstoque()).rejects.toThrow(/precisa de conciliação/i)
    expect(JSON.parse(localStorage.getItem(chave)!)).toEqual(pendente)
  })

  it('sincroniza apenas cadastro necessário e repete baixa após recusa por material ausente', async () => {
    const materialId = (await db.materiais.add({ nome: 'Resina', categoriaId: 1, unidade: 'kg', quantidadeEstoque: 10, custoUnitario: 10 }))!
    const outroId = (await db.materiais.add({ nome: 'Outro', categoriaId: 1, unidade: 'kg', quantidadeEstoque: 10, custoUnitario: 10 }))!
    const formaId = await criarForma({ nome: 'Molde', geometria: 'direto', dimensoesCm: {} })
    const evento = (id: string, registroId: number) => ({ id, tabela: 'materiais', registroId: String(registroId), acao: 'insert' as const, dadosString: JSON.stringify({ id: registroId, quantidadeEstoque: 10 }), timestamp: 1, sincronizado: false })
    await db.syncQueue.bulkAdd([evento('necessario', materialId), evento('outro', outroId)])
    rpc.mockResolvedValueOnce({ data: null, error: { message: 'Material não encontrado no servidor' } })
    rpc.mockResolvedValueOnce({ data: { estado: 'nao_encontrada', saldos: [] }, error: null })
    rpc.mockResolvedValueOnce({ data: [{ materialId, saldo: 8 }], error: null })
    inserir.mockResolvedValue({ error: null })
    const id = await criarPeca({ nome: 'Peça', formaId, consumos: [{ materialId, quantidade: 2 }] })
    expect(await db.pecas.get(id)).toBeDefined()
    expect((await db.materiais.get(materialId))?.quantidadeEstoque).toBe(8)
    expect(inserir).toHaveBeenCalledOnce()
    expect(inserir.mock.calls[0][0]).toEqual([expect.objectContaining({ id: 'necessario', registro_id: String(materialId) })])
    expect(await db.syncQueue.get('necessario')).toBeUndefined()
    expect(await db.syncQueue.get('outro')).toBeDefined()
    expect(rpc.mock.calls.map(x => x[0])).toEqual(['movimentar_estoque_atomico', 'recuperar_movimentacao_estoque', 'movimentar_estoque_atomico'])
  })

  it('preserva fila e dados se sincronização do cadastro necessário falhar', async () => {
    const materialId = (await db.materiais.add({ nome: 'Resina', categoriaId: 1, unidade: 'kg', quantidadeEstoque: 10, custoUnitario: 10 }))!
    const formaId = await criarForma({ nome: 'Molde', geometria: 'direto', dimensoesCm: {} })
    await db.syncQueue.add({ id: 'necessario', tabela: 'materiais', registroId: String(materialId), acao: 'insert', dadosString: JSON.stringify({ id: materialId, quantidadeEstoque: 10 }), timestamp: 1, sincronizado: false })
    rpc.mockResolvedValueOnce({ data: null, error: { message: 'Material não encontrado no servidor' } })
    rpc.mockResolvedValueOnce({ data: { estado: 'nao_encontrada', saldos: [] }, error: null })
    inserir.mockResolvedValue({ error: { message: 'Rede indisponível' } })
    await expect(criarPeca({ nome: 'Peça', formaId, consumos: [{ materialId, quantidade: 2 }] })).rejects.toThrow(/rede indisponível/i)
    expect(await db.syncQueue.get('necessario')).toBeDefined()
    expect(await db.pecas.count()).toBe(0)
    expect((await db.materiais.get(materialId))?.quantidadeEstoque).toBe(10)
    expect(rpc.mock.calls.map(x => x[0])).toEqual(['movimentar_estoque_atomico', 'recuperar_movimentacao_estoque'])
  })

  it('não tenta sincronizar ou repetir uma baixa recusada por saldo insuficiente', async () => {
    const materialId = (await db.materiais.add({ nome: 'Resina', categoriaId: 1, unidade: 'kg', quantidadeEstoque: 10, custoUnitario: 10 }))!
    const formaId = await criarForma({ nome: 'Molde', geometria: 'direto', dimensoesCm: {} })
    await db.syncQueue.add({ id: 'necessario', tabela: 'materiais', registroId: String(materialId), acao: 'insert', dadosString: JSON.stringify({ id: materialId, quantidadeEstoque: 10 }), timestamp: 1, sincronizado: false })
    rpc.mockResolvedValueOnce({ data: null, error: { message: 'Estoque insuficiente' } })
    await expect(criarPeca({ nome: 'Peça', formaId, consumos: [{ materialId, quantidade: 2 }] })).rejects.toThrow(/estoque insuficiente/i)
    expect(inserir).not.toHaveBeenCalled()
    expect(rpc).toHaveBeenCalledTimes(1)
    expect(await db.syncQueue.get('necessario')).toBeDefined()
    expect(await db.pecas.count()).toBe(0)
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
    const formaId = await criarForma({ nome: 'Molde', geometria: 'direto', dimensoesCm: {} })
    rpc.mockResolvedValueOnce({ data: [{ materialId: String(materialId), saldo: 8 }], error: null })
    const pecaId = await criarPeca({ nome: 'Peça', formaId, consumos: [{ materialId, quantidade: 2 }] })
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
