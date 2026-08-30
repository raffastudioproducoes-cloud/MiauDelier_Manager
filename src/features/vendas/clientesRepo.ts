import { db } from '../../db/schema'
import { cifrarCampo, decifrarCampo } from '../../lib/camposCifrados'

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
  const contatoCifrado = novo.contato ? await cifrarCampo(novo.contato) : undefined
  const id = await db.clientes.add({ nome: novo.nome, contato: contatoCifrado })
  return id as number
}

export async function listarClientes(): Promise<ClienteDecifrado[]> {
  const registros = await db.clientes.toArray()
  return Promise.all(
    registros.map(async (registro) => ({
      id: registro.id as number,
      nome: registro.nome,
      contato: registro.contato ? await decifrarCampo(registro.contato) : undefined,
    })),
  )
}

export async function atualizarCliente(clienteId: number, novo: NovoCliente): Promise<void> {
  const contatoCifrado = novo.contato ? await cifrarCampo(novo.contato) : undefined
  await db.clientes.update(clienteId, { nome: novo.nome, contato: contatoCifrado })
}

export async function excluirCliente(clienteId: number): Promise<void> {
  await db.clientes.delete(clienteId)
}
