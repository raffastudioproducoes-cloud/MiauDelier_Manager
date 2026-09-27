import { db, type Taxa } from '../../db/schema'
import { registrarAuditoria } from '../auditoria/auditoriaRepo'

export interface NovaTaxa {
  nome: string
  percentual: number // Ex: 0.14 para 14% da Shopee
  valorFixo: number  // Ex: 3.00 para R$ 3,00 taxa fixa
}

export async function criarTaxa(nova: NovaTaxa): Promise<number> {
  const agora = new Date().toISOString()
  const id = await db.taxas.add({
    nome: nova.nome,
    percentual: nova.percentual,
    valorFixo: nova.valorFixo,
    criadoEm: agora,
  })
  return id as number
}

export async function listarTaxas(): Promise<Taxa[]> {
  return db.taxas.toArray()
}

export async function atualizarTaxa(id: number, dados: NovaTaxa): Promise<void> {
  await db.taxas.update(id, {
    nome: dados.nome,
    percentual: dados.percentual,
    valorFixo: dados.valorFixo,
  })
}

export async function excluirTaxa(id: number): Promise<void> {
  await db.transaction('rw', db.taxas, db.auditoria, async () => {
    await db.taxas.delete(id)
    await registrarAuditoria('taxa', id)
  })
}
