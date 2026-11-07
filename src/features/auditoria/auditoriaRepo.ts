import { transacaoSincronizada } from '../../lib/transacaoSincronizada'
import { db, type RegistroAuditoria } from '../../db/schema'

export async function registrarAuditoria(
  entidade: string,
  entidadeId: number,
  acao: 'exclusao' | 'alteracao_preco' | 'venda',
  valorAnterior?: string,
  valorNovo?: string,
): Promise<void> {
  return transacaoSincronizada(async () => {
  await db.auditoria.add({ entidade, entidadeId, acao, quem: 'usuário', quando: new Date().toISOString(), valorAnterior, valorNovo })

  })
}

export async function listarAuditoria(): Promise<RegistroAuditoria[]> {
  const registros = await db.auditoria.toArray()
  return registros.sort((a, b) => b.quando.localeCompare(a.quando))
}
