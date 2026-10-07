import { db } from '../../db/schema'
import { registrarAuditoria } from '../auditoria/auditoriaRepo'

export interface NovoCliente {
  nome: string
  contato?: string
}

export interface ClienteDecifrado {
  id: number
  nome: string
  contato?: string
}

export async function criarCliente(novo: NovoCliente): Promise<number> {
  const id = await db.clientes.add(novo)
  return id as number
}

export async function listarClientes(): Promise<ClienteDecifrado[]> {
  const registros = await db.clientes.toArray()
  return Promise.all(
    registros.map(async (registro) => ({
      id: registro.id as number,
      nome: registro.nome,
      contato: registro.contato,
    })),
  )
}

export async function atualizarCliente(clienteId: number, novo: NovoCliente): Promise<void> {
  await db.clientes.update(clienteId, novo)
}

export async function excluirCliente(clienteId: number): Promise<void> {
  await db.transaction('rw', db.clientes, db.auditoria, async () => {
    await db.clientes.delete(clienteId)
    await registrarAuditoria('cliente', clienteId, 'exclusao')
  })
}
