import { useEffect, useRef, useState } from 'react'
import { z } from 'zod'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { TextField } from '../../components/ui/TextField'
import { EmptyState } from '../../components/ui/EmptyState'
import { ConfirmModal } from '../../components/ui/ConfirmModal'
import { useToast } from '../../components/ui/useToast'
import { criarConta, listarContas, atualizarNomeConta, excluirConta, type ContaDecifrada } from './contasRepo'

const schemaConta = z.object({
  nome: z.string().trim().min(1, 'Informe o nome da conta').max(80),
  saldoInicial: z.number().finite().min(0, 'Saldo inicial não pode ser negativo'),
})

const schemaNome = schemaConta.pick({ nome: true })

export function ContasPage() {
  const { mostrarToast } = useToast()
  const montado = useRef(true)
  const [contas, setContas] = useState<ContaDecifrada[]>([])
  const [nome, setNome] = useState('')
  const [saldoInicial, setSaldoInicial] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [contaEmEdicaoId, setContaEmEdicaoId] = useState<number | null>(null)
  const [contaExcluindoId, setContaExcluindoId] = useState<number | null>(null)

  async function recarregar() {
    const lista = await listarContas()
    if (!montado.current) return
    setContas(lista)
  }

  useEffect(() => {
    montado.current = true
    recarregar().catch((falha) => {
      if (!montado.current) return
      mostrarToast(falha instanceof Error ? falha.message : 'Erro ao carregar contas.', 'erro')
    })
    return () => {
      montado.current = false
    }
  }, [])

  function limparFormulario() {
    setNome('')
    setSaldoInicial('')
    setContaEmEdicaoId(null)
  }

  function iniciarEdicao(conta: ContaDecifrada) {
    setContaEmEdicaoId(conta.id)
    setNome(conta.nome)
    setSaldoInicial('')
  }

  async function handleSubmit(evento: React.FormEvent) {
    evento.preventDefault()
    setErro(null)

    if (contaEmEdicaoId !== null) {
      const resultado = schemaNome.safeParse({ nome })
      if (!resultado.success) {
        setErro(resultado.error.issues[0]?.message ?? 'Dados inválidos')
        return
      }
      try {
        await atualizarNomeConta(contaEmEdicaoId, resultado.data.nome)
        if (!montado.current) return
        mostrarToast('Conta atualizada com sucesso')
        limparFormulario()
        await recarregar()
      } catch (falha) {
        if (!montado.current) return
        mostrarToast(falha instanceof Error ? falha.message : 'Erro ao atualizar conta.', 'erro')
      }
      return
    }

    const resultado = schemaConta.safeParse({ nome, saldoInicial: Number(saldoInicial) || 0 })
    if (!resultado.success) {
      setErro(resultado.error.issues[0]?.message ?? 'Dados inválidos')
      return
    }

    try {
      await criarConta(resultado.data)
      if (!montado.current) return
      mostrarToast('Conta cadastrada com sucesso')
      limparFormulario()
      await recarregar()
    } catch (falha) {
      if (!montado.current) return
      mostrarToast(falha instanceof Error ? falha.message : 'Erro ao salvar conta.', 'erro')
    }
  }

  async function handleExcluir(contaId: number) {
    try {
      await excluirConta(contaId)
    } catch (falha) {
      if (!montado.current) return
      mostrarToast(falha instanceof Error ? falha.message : 'Erro ao excluir conta.', 'erro')
      setContaExcluindoId(null)
      return
    }
    if (!montado.current) return
    mostrarToast('Conta excluída com sucesso')
    setContaExcluindoId(null)
    await recarregar()
  }

  const totalConsolidado = contas.reduce((soma, conta) => soma + conta.saldo, 0)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-on-surface">Contas</h1>
        <p className="text-label-sm text-on-surface-variant">Saldos distribuídos do ateliê.</p>
      </div>

      {contas.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-on-surface">Saldo Consolidado</h2>
          <div className="rounded-xl border border-primary/30 bg-surface-container p-5">
            <p className="text-label-sm text-on-surface-variant">Total disponível</p>
            <p className="mt-1 text-2xl font-semibold text-primary">
              {totalConsolidado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
          </div>
        </section>
      )}

      <Card>
        <h2 className="mb-3 font-medium text-on-surface">
          {contaEmEdicaoId !== null ? 'Editar conta' : 'Cadastrar conta'}
        </h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <TextField id="nome-conta" rotulo="Nome da conta" value={nome} onChange={(e) => setNome(e.target.value)} />
          <TextField
            id="saldo-inicial"
            rotulo="Saldo inicial (R$)"
            type="number"
            value={saldoInicial}
            onChange={(e) => setSaldoInicial(e.target.value)}
            disabled={contaEmEdicaoId !== null}
          />
          {erro && <p role="alert" className="text-sm text-error">{erro}</p>}
          <div className="flex gap-2">
            <Button type="submit">{contaEmEdicaoId !== null ? 'Salvar' : 'Cadastrar conta'}</Button>
            {contaEmEdicaoId !== null && (
              <Button type="button" variante="ghost" onClick={limparFormulario}>Cancelar edição</Button>
            )}
          </div>
        </form>
      </Card>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-on-surface">Minhas Contas</h2>
        {contas.length === 0 ? (
          <EmptyState titulo="Nenhuma conta cadastrada" descricao="Cadastre a primeira conta do seu ateliê." />
        ) : (
          <ul className="flex flex-col gap-3">
            {contas.map((conta) => (
              <Card key={conta.id} className="glow-hover flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-outline-variant bg-surface-container text-sm font-semibold text-primary">
                  {conta.nome.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-on-surface">{conta.nome}</p>
                  <p className="mt-1 text-label-sm text-on-surface-variant">
                    {conta.saldo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variante="ghost" onClick={() => iniciarEdicao(conta)}>Editar</Button>
                  <Button variante="ghost" onClick={() => setContaExcluindoId(conta.id)}>Excluir</Button>
                </div>
              </Card>
            ))}
          </ul>
        )}
      </section>

      <ConfirmModal
        aberto={contaExcluindoId !== null}
        titulo="Excluir conta?"
        descricao="Contas com transações registradas não podem ser excluídas."
        onConfirmar={() => contaExcluindoId !== null && handleExcluir(contaExcluindoId)}
        onCancelar={() => setContaExcluindoId(null)}
      />
    </div>
  )
}
