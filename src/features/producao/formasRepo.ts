import { db, type Forma } from '../../db/schema'
import { registrarAuditoria } from '../auditoria/auditoriaRepo'

export type NovaForma = Omit<Forma, 'id'>

export async function criarForma(nova: NovaForma): Promise<number> {
  const id = await db.formas.add(nova)
  return id as number
}

export async function listarFormas(): Promise<Forma[]> {
  return db.formas.toArray()
}

export async function atualizarForma(formaId: number, dados: NovaForma): Promise<void> {
  await db.formas.update(formaId, dados)
}

export async function excluirForma(formaId: number): Promise<void> {
  await db.transaction('rw', db.formas, db.auditoria, async () => {
    await db.formas.delete(formaId)
    await registrarAuditoria('forma', formaId)
  })
}
