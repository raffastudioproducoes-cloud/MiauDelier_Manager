import { useEffect, useRef, useState } from 'react'
import { z } from 'zod'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { TextField } from '../../components/ui/TextField'
import { EmptyState } from '../../components/ui/EmptyState'
import { useToast } from '../../components/ui/useToast'
import { criarConta, listarContas, type ContaDecifrada } from './contasRepo'

const schemaConta = z.object({
  nome: z.string().trim().min(1, 'Informe o nome da conta').max(80),
  saldoInicial: z.number().finite().min(0, 'Saldo inicial não pode ser negativo'),
})

export function ContasPage() {
  const { mostrarToast } = useToast()
  const montado = useRef(true)
  const [contas, setContas] = useState<ContaDecifrada[]>([])
  const [nome, setNome] = useState('')
  const [saldoInicial, setSaldoInicial] = useState('')
  const [erro, setErro] = useState<string | null>(null)

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

  async function handleSubmit(evento: React.FormEvent) {
    evento.preventDefault()
    setErro(null)

    const resultado = schemaConta.safeParse({ nome, saldoInicial: Number(saldoInicial) || 0 })
    if (!resultado.success) {
      setErro(resultado.error.issues[0]?.message ?? 'Dados inválidos')
      return
    }

    try {
      await criarConta(resultado.data)
      if (!montado.current) return
      mostrarToast('Conta cadastrada com sucesso')
      setNome('')
      setSaldoInicial('')
      await recarregar()
    } catch (falha) {
      if (!montado.current) return
      mostrarToast(falha instanceof Error ? falha.message : 'Erro ao salvar conta.', 'erro')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Contas</h1>
      <Card>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <TextField id="nome-conta" rotulo="Nome da conta" value={nome} onChange={(e) => setNome(e.target.value)} />
          <TextField id="saldo-inicial" rotulo="Saldo inicial (R$)" type="number" value={saldoInicial} onChange={(e) => setSaldoInicial(e.target.value)} />
          {erro && <p role="alert" className="text-sm text-[var(--color-danger)]">{erro}</p>}
          <Button type="submit">Cadastrar conta</Button>
        </form>
      </Card>

      {contas.length === 0 ? (
        <EmptyState titulo="Nenhuma conta cadastrada" descricao="Cadastre a primeira conta do seu ateliê." />
      ) : (
        <ul className="flex flex-col gap-2">
          {contas.map((conta) => (
            <Card key={conta.id} className="flex items-center justify-between">
              <p className="font-medium">{conta.nome}</p>
              <p className="text-sm text-[var(--color-ink-muted)]">
                {conta.saldo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
            </Card>
          ))}
        </ul>
      )}
    </div>
  )
}
