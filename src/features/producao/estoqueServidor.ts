import { supabase } from '../../lib/supabase'
import { getPerfilAtivo } from '../../lib/perfisRepo'
import Dexie from 'dexie'
import { db } from '../../db/schema'

export interface MovimentoEstoque {
  materialId: number
  diferenca: number
}

export async function transacaoComEstoque<T>(executar: () => Promise<T>): Promise<T> {
  if (Dexie.currentTransaction) return executar()
  return db.transaction('rw', db.tables, async () => {
    const anteriores = new Map((await db.materiais.toArray()).map(m => [m.id, m.quantidadeEstoque]))
    const resultado = await executar()
    const movimentos = (await db.materiais.toArray()).flatMap(m => {
      const anterior = anteriores.get(m.id)
      if (m.id === undefined || anterior === undefined || m.quantidadeEstoque === anterior) return []
      return [{ materialId: m.id, diferenca: m.quantidadeEstoque - anterior }]
    })
    if (movimentos.length > 0) {
      const saldos = await Dexie.waitFor(confirmarMovimentosEstoque(crypto.randomUUID(), movimentos))
      for (const [id, saldo] of saldos) await db.materiais.update(id, { quantidadeEstoque: saldo })
    }
    return resultado
  })
}

export async function confirmarMovimentosEstoque(operacaoId: string, movimentos: MovimentoEstoque[]): Promise<Map<number, number>> {
  if (!operacaoId || movimentos.length === 0 || new Set(movimentos.map(m => m.materialId)).size !== movimentos.length || movimentos.some(m => !Number.isSafeInteger(m.materialId) || m.materialId <= 0 || !Number.isFinite(m.diferenca))) {
    throw new Error('Movimentação de estoque inválida.')
  }
  const perfil = await getPerfilAtivo()
  if (!perfil.supabaseId) throw new Error('Sincronize o perfil antes de movimentar o estoque.')
  const { data, error } = await supabase.rpc('movimentar_estoque_atomico', {
    p_perfil_id: perfil.supabaseId,
    p_operacao_id: operacaoId,
    p_movimentos: movimentos,
  })
  if (error) throw new Error(error.message || 'Não foi possível confirmar o estoque no servidor.')
  if (!Array.isArray(data) || data.length !== movimentos.length) throw new Error('Resposta inválida do servidor de estoque.')
  const saldos = new Map<number, number>()
  for (const item of data) {
    if (!item || (typeof item.saldo !== 'number' && typeof item.saldo !== 'string') || item.saldo === '') throw new Error('Resposta inválida do servidor de estoque.')
    const id = Number(item.materialId)
    const saldo = Number(item.saldo)
    if (!Number.isSafeInteger(id) || !Number.isFinite(saldo) || saldo < 0 || saldos.has(id)) throw new Error('Resposta inválida do servidor de estoque.')
    saldos.set(id, saldo)
  }
  if (movimentos.some(m => !saldos.has(m.materialId))) throw new Error('Resposta inválida do servidor de estoque.')
  return saldos
}
