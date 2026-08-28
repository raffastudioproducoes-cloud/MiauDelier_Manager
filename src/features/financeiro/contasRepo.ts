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
    registros.map(async (registro) => {
      const id = registro.id as number
      const saldoInicial = Number(await decifrarCampo(registro.saldoCriptografado))
      // Acesso direto à tabela (em vez de importar transacoesRepo) evita import circular.
      const transacoes = await db.transacoes.where('contaId').equals(id).toArray()
      let movimento = 0
      for (const transacao of transacoes) {
        const valor = Number(await decifrarCampo(transacao.valorCriptografado))
        movimento += transacao.tipo === 'entrada' ? valor : -valor
      }
      return { id, nome: registro.nome, saldo: saldoInicial + movimento }
    }),
  )
}

export async function atualizarSaldoConta(contaId: number, novoSaldo: number): Promise<void> {
  const saldoCriptografado = await cifrarCampo(novoSaldo.toString())
  await db.contas.update(contaId, { saldoCriptografado })
}
