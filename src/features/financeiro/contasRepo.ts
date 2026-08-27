import { db } from '../../db/schema'
import { cifrarCampo, decifrarCampo } from '../../lib/camposCifrados'

export interface NovaConta {
  nome: string
  saldoInicial: number
}

export interface ContaDecifrada {
  id: number
  nome: string
  saldo: number
}

export async function criarConta(nova: NovaConta): Promise<number> {
  const saldoCriptografado = await cifrarCampo(nova.saldoInicial.toString())
  const id = await db.contas.add({ nome: nova.nome, saldoCriptografado })
  return id as number
}

export async function listarContas(): Promise<ContaDecifrada[]> {
  const registros = await db.contas.toArray()
  return Promise.all(
    registros.map(async (registro) => ({
      id: registro.id as number,
      nome: registro.nome,
      saldo: Number(await decifrarCampo(registro.saldoCriptografado)),
    })),
  )
}

export async function atualizarSaldoConta(contaId: number, novoSaldo: number): Promise<void> {
  const saldoCriptografado = await cifrarCampo(novoSaldo.toString())
  await db.contas.update(contaId, { saldoCriptografado })
}
