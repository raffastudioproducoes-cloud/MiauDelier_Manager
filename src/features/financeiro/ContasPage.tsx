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

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Contas</h1>
      <Card>
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
          {erro && <p role="alert" className="text-sm text-[var(--color-danger)]">{erro}</p>}
          <div className="flex gap-2">
            <Button type="submit">{contaEmEdicaoId !== null ? 'Salvar' : 'Cadastrar conta'}</Button>
            {contaEmEdicaoId !== null && (
              <Button type="button" variante="ghost" onClick={limparFormulario}>Cancelar edição</Button>
            )}
          </div>
        </form>
      </Card>

      {contas.length === 0 ? (
        <EmptyState titulo="Nenhuma conta cadastrada" descricao="Cadastre a primeira conta do seu ateliê." />
      ) : (
        <ul className="flex flex-col gap-2">
          {contas.map((conta) => (
            <Card key={conta.id} className="flex items-center justify-between">
              <div>
                <p className="font-medium">{conta.nome}</p>
                <p className="text-sm text-[var(--color-ink-muted)]">
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
