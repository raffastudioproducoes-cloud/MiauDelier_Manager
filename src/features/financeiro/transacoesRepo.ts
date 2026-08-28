import { db, type TipoTransacao } from '../../db/schema'
import { cifrarCampo, decifrarCampo } from '../../lib/camposCifrados'

export interface NovaTransacao {
  contaId: number
  tipo: TipoTransacao
  valor: number
  descricao: string
  data: string
}

export interface TransacaoDecifrada {
  id: number
  contaId: number
  tipo: TipoTransacao
  valor: number
  descricao: string
  data: string
}

export async function criarTransacao(nova: NovaTransacao): Promise<number> {
  const valorCriptografado = await cifrarCampo(nova.valor.toString())
  const id = await db.transacoes.add({
    contaId: nova.contaId,
    tipo: nova.tipo,
    valorCriptografado,
    descricao: nova.descricao,
    data: nova.data,
  })
  return id as number
}

export async function listarTransacoesDaConta(contaId: number): Promise<TransacaoDecifrada[]> {
  const registros = await db.transacoes.where('contaId').equals(contaId).toArray()
  return Promise.all(
    registros.map(async (registro) => ({
      id: registro.id!,
      contaId: registro.contaId,
      tipo: registro.tipo,
      valor: Number(await decifrarCampo(registro.valorCriptografado)),
      descricao: registro.descricao,
      data: registro.data,
    })),
  )
}

export async function listarTodasTransacoes(): Promise<TransacaoDecifrada[]> {
  const registros = await db.transacoes.toArray()
  return Promise.all(
    registros.map(async (registro) => ({
      id: registro.id!,
      contaId: registro.contaId,
      tipo: registro.tipo,
      valor: Number(await decifrarCampo(registro.valorCriptografado)),
      descricao: registro.descricao,
      data: registro.data,
    })),
  )
}
