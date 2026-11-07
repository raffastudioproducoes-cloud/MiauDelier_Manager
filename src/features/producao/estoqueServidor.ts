import { supabase } from '../../lib/supabase'
import { getPerfilAtivo } from '../../lib/perfisRepo'
import Dexie from 'dexie'
import { db } from '../../db/schema'
import { enviarEventosComReenvio, type EventoSincronizado } from '../../lib/reenvioEventos'

export interface MovimentoEstoque {
  materialId: number
  diferenca: number
}

interface OperacaoPendente {
  operacaoId: string
  reversaoId: string
  perfilId: number
  movimentos: MovimentoEstoque[]
}

function chavePendencia(): string { return `miaudelier_estoque_pendente:${db.name}` }
function chaveMarcador(id: string): string { return `estoque_confirmado:${id}` }

/** Envia apenas cadastros ainda pendentes antes de repetir uma baixa recusada. */
async function sincronizarCadastrosPendentes(materialIds: Set<number>): Promise<boolean> {
  const fila = await db.syncQueue.where('tabela').equals('materiais').toArray()
  const pendentes = []
  for (const evento of fila) {
    if (evento.acao !== 'insert' || !evento.id) continue
    const materialId = Number(evento.registroId)
    if (materialIds.has(materialId) && Number.isSafeInteger(materialId) && materialId > 0 && await db.materiais.get(materialId)) pendentes.push(evento)
  }
  if (!pendentes.length) return false
  const perfil = await getPerfilAtivo()
  if (!perfil.supabaseId) throw new Error('Sincronize o perfil antes de movimentar o estoque.')
  const perfilId = perfil.supabaseId
  pendentes.sort((a, b) => a.timestamp - b.timestamp || String(a.id).localeCompare(String(b.id)))
  const payloads: EventoSincronizado[] = pendentes.map(evento => ({
    id: evento.id!, perfil_id: perfilId, tabela: evento.tabela, registro_id: evento.registroId,
    acao: evento.acao, dados_criptografados: evento.dadosString === '{}' ? '' : evento.dadosString,
    timestamp: evento.timestamp,
  }))
  await enviarEventosComReenvio(payloads, async eventos => {
    const { error } = await supabase.from('sync_events').insert(eventos)
    return error
  }, async id => {
    const { data, error } = await supabase.from('sync_events')
      .select('id,perfil_id,tabela,registro_id,acao,dados_criptografados,timestamp')
      .eq('id', id).eq('perfil_id', perfilId).maybeSingle()
    if (error) throw error
    return data as EventoSincronizado | null
  })
  await db.syncQueue.bulkDelete(pendentes.map(evento => evento.id!))
  return true
}

/** Reconciliacao é sempre feita sob a trava de perfil do servidor. */
export async function recuperarPendenciaEstoque(): Promise<void> {
  const texto = localStorage.getItem(chavePendencia())
  if (!texto) return
  let pendente: OperacaoPendente
  try { pendente = JSON.parse(texto) as OperacaoPendente } catch { throw new Error('Registro de estoque pendente inválido. Não repita a operação antes de reconciliar o estoque.') }
  if (!pendente.operacaoId || !pendente.reversaoId || !Number.isSafeInteger(pendente.perfilId) || !Array.isArray(pendente.movimentos)) throw new Error('Registro de estoque pendente inválido. Não repita a operação antes de reconciliar o estoque.')
  const perfil = await getPerfilAtivo()
  if (perfil.supabaseId !== pendente.perfilId) throw new Error('Há uma operação de estoque pendente em outro perfil. Retorne a esse perfil para reconciliá-la.')
  const marcador = await db.syncMetadata.where('chave').equals(chaveMarcador(pendente.operacaoId)).first()
  if (!marcador) {
    const { data, error } = await supabase.rpc('recuperar_movimentacao_estoque', {
      p_perfil_id: pendente.perfilId,
      p_operacao_id: pendente.operacaoId,
      p_reversao_id: pendente.reversaoId,
      p_movimentos: pendente.movimentos,
    })
    if (error?.message && /estoque insuficiente/i.test(error.message)) {
      throw new Error('Não foi possível desfazer uma movimentação pendente porque parte do estoque já foi utilizada. A operação continua bloqueada e precisa de conciliação antes de novas alterações.')
    }
    if (error || !data || !['estornada', 'nao_encontrada'].includes(data.estado) || !Array.isArray(data.saldos)) {
      throw new Error('Não foi possível reconciliar a movimentação pendente. Mantenha este dispositivo conectado e tente novamente antes de alterar o estoque.')
    }
    const idsEsperados = new Set(pendente.movimentos.map(item => item.materialId))
    const idsRecebidos = new Set((data.saldos as Array<{ materialId: string | number }>).map(item => Number(item.materialId)))
    if ((data.estado === 'nao_encontrada' && data.saldos.length !== 0) ||
        (data.estado === 'estornada' && (data.saldos.length !== idsEsperados.size || idsRecebidos.size !== idsEsperados.size || [...idsEsperados].some(id => !idsRecebidos.has(id))))) {
      throw new Error('Resposta inválida ao reconciliar o estoque. A operação permanece pendente.')
    }
    await db.transaction('rw', db.materiais, db.syncQueue, async () => {
      for (const item of data.saldos as Array<{ materialId: string | number; saldo: string | number }>) {
        const id = Number(item.materialId)
        const saldo = Number(item.saldo)
        if (!Number.isSafeInteger(id) || !Number.isFinite(saldo) || saldo < 0 || !await db.materiais.get(id)) throw new Error('Não foi possível conciliar o material da operação pendente.')
        await db.materiais.update(id, { quantidadeEstoque: saldo })
      }
    })
  }
  localStorage.removeItem(chavePendencia())
  if (marcador?.id !== undefined) await db.syncMetadata.delete(marcador.id)
}

export async function transacaoComEstoque<T>(executar: () => Promise<T>): Promise<T> {
  if (Dexie.currentTransaction) return executar()
  const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined
  if (!locks && localStorage.getItem(chavePendencia())) throw new Error('O navegador não oferece bloqueio seguro entre abas. Não é possível reconciliar o estoque neste navegador.')
  const processar = async () => {
  await recuperarPendenciaEstoque()
  let operacaoId: string | undefined
  const executarTransacao = () => db.transaction('rw', db.tables, async () => {
    const anteriores = new Map((await db.materiais.toArray()).map(m => [m.id, m.quantidadeEstoque]))
    const resultado = await executar()
    const movimentos = (await db.materiais.toArray()).flatMap(m => {
      const anterior = anteriores.get(m.id)
      if (m.id === undefined || anterior === undefined || m.quantidadeEstoque === anterior) return []
      return [{ materialId: m.id, diferenca: m.quantidadeEstoque - anterior }]
    })
    if (movimentos.length > 0) {
      if (!locks) throw new Error('O navegador não oferece bloqueio seguro entre abas. Não é possível movimentar o estoque neste navegador.')
      const perfil = await Dexie.waitFor(getPerfilAtivo())
      if (!perfil.supabaseId) throw new Error('Sincronize o perfil antes de movimentar o estoque.')
      operacaoId = crypto.randomUUID()
      const pendente: OperacaoPendente = { operacaoId, reversaoId: crypto.randomUUID(), perfilId: perfil.supabaseId, movimentos }
      // Persistido antes da chamada; o marcador só é gravado se toda a transação local confirmar.
      localStorage.setItem(chavePendencia(), JSON.stringify(pendente))
      const saldos = await Dexie.waitFor(confirmarMovimentosEstoque(operacaoId, movimentos))
      for (const [id, saldo] of saldos) await db.materiais.update(id, { quantidadeEstoque: saldo })
      await db.syncMetadata.add({ chave: chaveMarcador(operacaoId), valor: 'confirmado' })
    }
    return resultado
  })
  let resultadoFinal: T
  try {
    resultadoFinal = await executarTransacao()
  } catch (falha) {
    if (!(falha instanceof Error) || !/material não encontrado no servidor/i.test(falha.message)) throw falha
    // A recusa do servidor reverteu a operação local. O journal precisa ser
    // reconciliado antes de cadastrar o material e repetir a baixa.
    let materialIds: Set<number>
    try {
      const pendente = JSON.parse(localStorage.getItem(chavePendencia()) || 'null') as OperacaoPendente | null
      if (!pendente || !Array.isArray(pendente.movimentos)) throw new Error('journal ausente', { cause: falha })
      materialIds = new Set(pendente.movimentos.map(item => item.materialId))
    } catch {
      throw new Error('Não foi possível identificar os materiais da operação pendente. A fila foi preservada.', { cause: falha })
    }
    await recuperarPendenciaEstoque()
    if (!await sincronizarCadastrosPendentes(materialIds)) throw falha
    resultadoFinal = await executarTransacao()
  }
  // Se a limpeza falhar, a operação local já foi confirmada; o marcador impede
  // qualquer compensação indevida na próxima tentativa de limpeza.
  if (operacaoId) {
    try { await recuperarPendenciaEstoque() } catch { /* O journal será limpo ao próximo uso. */ }
  }
  return resultadoFinal
  }
  // Web Locks serializa abas do mesmo navegador. A trava de perfil no banco protege dispositivos distintos.
  return locks ? locks.request(`miaudelier-estoque:${db.name}`, processar) : processar()
}

export async function confirmarMovimentosEstoque(operacaoId: string, movimentos: MovimentoEstoque[]): Promise<Map<number, number>> {
  if (!operacaoId || movimentos.length === 0 || new Set(movimentos.map(m => m.materialId)).size !== movimentos.length || movimentos.some(m => !Number.isSafeInteger(m.materialId) || m.materialId <= 0 || !Number.isFinite(m.diferenca))) {
    throw new Error('Movimentação de estoque inválida.')
  }
  const perfil = await getPerfilAtivo()
  if (!perfil.supabaseId) throw new Error('Sincronize o perfil antes de movimentar o estoque.')
  // O servidor guarda o resultado por operação. Se a resposta se perder,
  // repetir com o MESMO identificador consulta o resultado sem aplicar a
  // movimentação novamente. Não gerar um novo UUID nesta tentativa.
  const argumentos = {
    p_perfil_id: perfil.supabaseId,
    p_operacao_id: operacaoId,
    p_movimentos: movimentos,
  }
  let resposta
  for (let tentativa = 0; tentativa < 2; tentativa++) {
    try {
      const atual = await supabase.rpc('movimentar_estoque_atomico', argumentos)
      const falhaTransporte = atual.status === 0 || atual.status >= 500
      if (atual.error && falhaTransporte) {
        if (tentativa === 0) continue
        throw new Error('Não foi possível confirmar se o estoque foi movimentado. Confira o saldo e a peça antes de tentar novamente.')
      }
      resposta = atual
      break
    } catch (falha) {
      if (!(falha instanceof TypeError)) throw falha
      if (tentativa === 0) continue
      throw new Error('Não foi possível confirmar se o estoque foi movimentado. Confira o saldo e a peça antes de tentar novamente.', { cause: falha })
    }
  }
  if (!resposta) throw new Error('Não foi possível confirmar a movimentação de estoque.')
  const { data, error } = resposta
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
