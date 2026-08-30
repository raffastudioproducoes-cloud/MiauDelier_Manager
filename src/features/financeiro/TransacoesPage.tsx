import { useEffect, useRef, useState } from 'react'
import { z } from 'zod'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { TextField } from '../../components/ui/TextField'
import { EmptyState } from '../../components/ui/EmptyState'
import { ConfirmModal } from '../../components/ui/ConfirmModal'
import { useToast } from '../../components/ui/useToast'
import {
  criarTransacao,
  listarTransacoesDaConta,
  atualizarTransacao,
  excluirTransacao,
  type TransacaoDecifrada,
} from './transacoesRepo'
import { listarContas, type ContaDecifrada } from './contasRepo'
import type { TipoTransacao } from '../../db/schema'

const schemaTransacao = z.object({
  valor: z.number().finite().min(0.01, 'Informe um valor maior que zero'),
  descricao: z.string().trim().min(1, 'Informe uma descrição').max(120),
  data: z.string().min(1, 'Informe a data'),
})

function hoje() {
  return new Date().toISOString().slice(0, 10)
}

function formatarData(data: string) {
  const [ano, mes, dia] = data.split('-')
  return `${dia}/${mes}/${ano}`
}

export function TransacoesPage() {
  const { mostrarToast } = useToast()
  const montado = useRef(true)
  const [contas, setContas] = useState<ContaDecifrada[]>([])
  const [transacoes, setTransacoes] = useState<TransacaoDecifrada[]>([])
  const [contaId, setContaId] = useState('')
  const [tipo, setTipo] = useState<TipoTransacao>('entrada')
  const [valor, setValor] = useState('')
  const [descricao, setDescricao] = useState('')
  const [data, setData] = useState(hoje())
  const [erro, setErro] = useState<string | null>(null)
  const [carregado, setCarregado] = useState(false)
  const [transacaoEmEdicaoId, setTransacaoEmEdicaoId] = useState<number | null>(null)
  const [transacaoExcluindoId, setTransacaoExcluindoId] = useState<number | null>(null)
  const [dataDe, setDataDe] = useState('')
  const [dataAte, setDataAte] = useState('')

  async function carregarTransacoes(idDaConta: string) {
    if (!idDaConta) {
      setTransacoes([])
      return
    }
    const listaTransacoes = await listarTransacoesDaConta(Number(idDaConta))
    if (!montado.current) return
    setTransacoes(listaTransacoes)
  }

  async function recarregar() {
    const listaContas = await listarContas()
    if (!montado.current) return
    setContas(listaContas)
    await carregarTransacoes(contaId)
  }

  useEffect(() => {
    montado.current = true
    recarregar()
      .then(() => {
        if (!montado.current) return
        setCarregado(true)
      })
      .catch((falha) => {
        if (!montado.current) return
        mostrarToast(falha instanceof Error ? falha.message : 'Erro ao carregar transações.', 'erro')
        setCarregado(true)
      })
    return () => {
      montado.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    carregarTransacoes(contaId).catch((falha) => {
      if (!montado.current) return
      mostrarToast(falha instanceof Error ? falha.message : 'Erro ao carregar transações.', 'erro')
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contaId])

  const faltaConta = contas.length === 0
  const contaSelecionada = contas.find((conta) => conta.id === Number(contaId))
  const transacoesFiltradas = transacoes.filter(
    (t) => (!dataDe || t.data >= dataDe) && (!dataAte || t.data <= dataAte),
  )

  if (!carregado) {
    return null
  }

  function limparFormulario() {
    setValor('')
    setDescricao('')
    setData(hoje())
    setTransacaoEmEdicaoId(null)
  }

  function iniciarEdicao(transacao: TransacaoDecifrada) {
    setTransacaoEmEdicaoId(transacao.id)
    setTipo(transacao.tipo)
    setValor(String(transacao.valor))
    setDescricao(transacao.descricao)
    setData(transacao.data)
  }

  async function handleSubmit(evento: React.FormEvent) {
    evento.preventDefault()
    setErro(null)
    if (!contaId) return

    const resultado = schemaTransacao.safeParse({ valor: Number(valor) || 0, descricao, data })
    if (!resultado.success) {
      setErro(resultado.error.issues[0]?.message ?? 'Dados inválidos')
      return
    }

    try {
      if (transacaoEmEdicaoId !== null) {
        await atualizarTransacao(transacaoEmEdicaoId, {
          contaId: Number(contaId),
          tipo,
          valor: resultado.data.valor,
          descricao: resultado.data.descricao,
          data: resultado.data.data,
        })
        if (!montado.current) return
        mostrarToast('Transação atualizada com sucesso')
      } else {
        await criarTransacao({
          contaId: Number(contaId),
          tipo,
          valor: resultado.data.valor,
          descricao: resultado.data.descricao,
          data: resultado.data.data,
        })
        if (!montado.current) return
        mostrarToast('Transação registrada com sucesso')
      }
      limparFormulario()
      await recarregar()
    } catch (falha) {
      if (!montado.current) return
      mostrarToast(falha instanceof Error ? falha.message : 'Erro ao registrar transação.', 'erro')
    }
  }

  async function handleExcluir(transacaoId: number) {
    try {
      await excluirTransacao(transacaoId)
    } catch (falha) {
      if (!montado.current) return
      mostrarToast(falha instanceof Error ? falha.message : 'Erro ao excluir transação.', 'erro')
      setTransacaoExcluindoId(null)
      return
    }
    if (!montado.current) return
    mostrarToast('Transação excluída com sucesso')
    setTransacaoExcluindoId(null)
    await recarregar()
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Transações</h1>

      {faltaConta && (
        <p role="alert" className="text-sm text-[var(--color-danger)]">
          Cadastre pelo menos uma conta antes de registrar uma transação.
        </p>
      )}

      <Card>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label htmlFor="conta-transacao" className="text-sm font-medium">Conta</label>
          <select
            id="conta-transacao"
            value={contaId}
            onChange={(e) => setContaId(e.target.value)}
            className="rounded-lg px-3 py-2 elevation-inset"
            disabled={transacaoEmEdicaoId !== null}
          >
            <option value="">Selecione</option>
            {contas.map((conta) => (
              <option key={conta.id} value={conta.id}>{conta.nome}</option>
            ))}
          </select>

          <label htmlFor="tipo-transacao" className="text-sm font-medium">Tipo</label>
          <select id="tipo-transacao" value={tipo} onChange={(e) => setTipo(e.target.value as TipoTransacao)} className="rounded-lg px-3 py-2 elevation-inset">
            <option value="entrada">Entrada</option>
            <option value="saida">Saída</option>
          </select>

          <TextField id="valor-transacao" rotulo="Valor (R$)" type="number" value={valor} onChange={(e) => setValor(e.target.value)} />
          <TextField id="descricao-transacao" rotulo="Descrição" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
          <TextField id="data-transacao" rotulo="Data" type="date" value={data} onChange={(e) => setData(e.target.value)} />

          {erro && <p role="alert" className="text-sm text-[var(--color-danger)]">{erro}</p>}
          <div className="flex gap-2">
            <Button type="submit" disabled={faltaConta || !contaId}>
              {transacaoEmEdicaoId !== null ? 'Salvar' : 'Registrar transação'}
            </Button>
            {transacaoEmEdicaoId !== null && (
              <Button type="button" variante="ghost" onClick={limparFormulario}>Cancelar edição</Button>
            )}
          </div>
        </form>
      </Card>

      {contaSelecionada && (
        <h2 className="text-sm font-medium text-[var(--color-ink-muted)]">
          Movimentações de {contaSelecionada.nome}
        </h2>
      )}

      {transacoes.length > 0 && (
        <Card className="flex flex-col gap-3 sm:flex-row">
          <TextField id="data-de-transacao" rotulo="De" type="date" value={dataDe} onChange={(e) => setDataDe(e.target.value)} />
          <TextField id="data-ate-transacao" rotulo="Até" type="date" value={dataAte} onChange={(e) => setDataAte(e.target.value)} />
        </Card>
      )}

      {transacoesFiltradas.length === 0 ? (
        <EmptyState titulo="Nenhuma transação registrada" descricao="Registre a primeira movimentação da conta." />
      ) : (
        <ul className="flex flex-col gap-2">
          {transacoesFiltradas.map((transacao) => (
            <Card key={transacao.id} className="flex items-center justify-between">
              <div>
                <p className="font-medium">{transacao.descricao}</p>
                <p className="text-sm text-[var(--color-ink-muted)]">{formatarData(transacao.data)}</p>
              </div>
              <div className="flex items-center gap-2">
                <p className={transacao.tipo === 'entrada' ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}>
                  {transacao.tipo === 'entrada' ? '+' : '-'} {transacao.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
                <Button variante="ghost" onClick={() => iniciarEdicao(transacao)}>Editar</Button>
                <Button variante="ghost" onClick={() => setTransacaoExcluindoId(transacao.id)}>Excluir</Button>
              </div>
            </Card>
          ))}
        </ul>
      )}

      <ConfirmModal
        aberto={transacaoExcluindoId !== null}
        titulo="Excluir transação?"
        descricao="Essa ação não pode ser desfeita."
        onConfirmar={() => transacaoExcluindoId !== null && handleExcluir(transacaoExcluindoId)}
        onCancelar={() => setTransacaoExcluindoId(null)}
      />
    </div>
  )
}
