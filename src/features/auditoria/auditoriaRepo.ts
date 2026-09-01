import { db, type RegistroAuditoria } from '../../db/schema'

export async function registrarAuditoria(
  entidade: string,
  entidadeId: number,
  valorAnterior?: string,
  valorNovo?: string,
): Promise<void> {
  await db.auditoria.add({ entidade, entidadeId, quem: 'usuário', quando: new Date().toISOString(), valorAnterior, valorNovo })
}

export async function listarAuditoria(): Promise<RegistroAuditoria[]> {
  const registros = await db.auditoria.toArray()
  return registros.sort((a, b) => b.quando.localeCompare(a.quando))
}
