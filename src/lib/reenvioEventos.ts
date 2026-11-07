export interface EventoSincronizado {
  id: string
  perfil_id: number
  tabela: string
  registro_id: string
  acao: string
  dados_criptografados: string
  timestamp: number
}

/** A repetição só é aceita quando o evento gravado é exatamente o enviado. */
export function mesmoEvento(a: EventoSincronizado, b: EventoSincronizado): boolean {
  return a.id === b.id && a.perfil_id === b.perfil_id && a.tabela === b.tabela &&
    a.registro_id === b.registro_id && a.acao === b.acao &&
    a.dados_criptografados === b.dados_criptografados && a.timestamp === b.timestamp
}

export async function enviarEventosComReenvio(
  eventos: EventoSincronizado[],
  inserir: (eventos: EventoSincronizado[]) => Promise<{ code?: string; message?: string } | null>,
  buscar: (id: string) => Promise<EventoSincronizado | null>,
): Promise<void> {
  const erroLote = await inserir(eventos)
  if (!erroLote) return
  if (erroLote.code !== '23505') throw new Error(erroLote.message || 'Falha ao sincronizar eventos.')

  for (const evento of eventos) {
    const existente = await buscar(evento.id)
    if (existente) {
      if (!mesmoEvento(existente, evento)) throw new Error('Conflito no identificador do evento. Os dados foram preservados na fila.')
      continue
    }
    const erro = await inserir([evento])
    if (erro) throw new Error(erro.message || 'Falha ao sincronizar evento.')
  }
}
