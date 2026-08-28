import { useEffect, useRef, useState } from 'react'
import { z } from 'zod'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { TextField } from '../../components/ui/TextField'
import { EmptyState } from '../../components/ui/EmptyState'
import { useToast } from '../../components/ui/useToast'
import { criarTransacao, listarTransacoesDaConta, type TransacaoDecifrada } from './transacoesRepo'
import { listarContas, type ContaDecifrada } from './contasRepo'
import type { TipoTransacao } from '../../db/schema'

const schemaTransacao = z.object({
  valor: z.number().finite().min(0.01, 'Informe um valor maior que zero'),
  descricao: z.string().trim().min(1, 'Informe uma descrição').max(120),
})

export function TransacoesPage() {
  const { mostrarToast } = useToast()
  const montado = useRef(true)
  const [contas, setContas] = useState<ContaDecifrada[]>([])
  const [transacoes, setTransacoes] = useState<TransacaoDecifrada[]>([])
  const [contaId, setContaId] = useState('')
  const [tipo, setTipo] = useState<TipoTransacao>('entrada')
  const [valor, setValor] = useState('')
  const [descricao, setDescricao] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [carregado, setCarregado] = useState(false)

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

  if (!carregado) {
    return null
  }

  async function handleSubmit(evento: React.FormEvent) {
    evento.preventDefault()
    setErro(null)
    if (!contaId) return

    const resultado = schemaTransacao.safeParse({ valor: Number(valor) || 0, descricao })
    if (!resultado.success) {
      setErro(resultado.error.issues[0]?.message ?? 'Dados inválidos')
      return
    }

    try {
      await criarTransacao({
        contaId: Number(contaId),
        tipo,
        valor: resultado.data.valor,
        descricao: resultado.data.descricao,
        data: new Date().toISOString(),
      })
      if (!montado.current) return
      mostrarToast('Transação registrada com sucesso')
      setValor('')
      setDescricao('')
      await recarregar()
    } catch (falha) {
      if (!montado.current) return
      mostrarToast(falha instanceof Error ? falha.message : 'Erro ao registrar transação.', 'erro')
    }
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
          <select id="conta-transacao" value={contaId} onChange={(e) => setContaId(e.target.value)} className="rounded-lg px-3 py-2 elevation-inset">
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

          {erro && <p role="alert" className="text-sm text-[var(--color-danger)]">{erro}</p>}
          <Button type="submit" disabled={faltaConta || !contaId}>Registrar transação</Button>
        </form>
      </Card>

      {contaSelecionada && (
        <h2 className="text-sm font-medium text-[var(--color-ink-muted)]">
          Movimentações de {contaSelecionada.nome}
        </h2>
      )}

      {transacoes.length === 0 ? (
        <EmptyState titulo="Nenhuma transação registrada" descricao="Registre a primeira movimentação da conta." />
      ) : (
        <ul className="flex flex-col gap-2">
          {transacoes.map((transacao) => (
            <Card key={transacao.id} className="flex items-center justify-between">
              <p className="font-medium">{transacao.descricao}</p>
              <p className={transacao.tipo === 'entrada' ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}>
                {transacao.tipo === 'entrada' ? '+' : '-'} {transacao.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
            </Card>
          ))}
        </ul>
      )}
    </div>
  )
}
