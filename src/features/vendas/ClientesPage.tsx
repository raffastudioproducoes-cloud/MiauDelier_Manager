import { useEffect, useRef, useState } from 'react'
import { z } from 'zod'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { TextField } from '../../components/ui/TextField'
import { EmptyState } from '../../components/ui/EmptyState'
import { useToast } from '../../components/ui/useToast'
import { criarCliente, listarClientes, type ClienteDecifrado } from './clientesRepo'

const schemaCliente = z.object({
  nome: z.string().trim().min(1, 'Informe o nome do cliente').max(120),
  contato: z.string().trim().max(60).optional(),
})

export function ClientesPage() {
  const { mostrarToast } = useToast()
  const montado = useRef(true)
  const [clientes, setClientes] = useState<ClienteDecifrado[]>([])
  const [nome, setNome] = useState('')
  const [contato, setContato] = useState('')
  const [erro, setErro] = useState<string | null>(null)

  async function recarregar() {
    const lista = await listarClientes()
    if (!montado.current) return
    setClientes(lista)
  }

  useEffect(() => {
    montado.current = true
    recarregar().catch((falha) => {
      if (!montado.current) return
      mostrarToast(falha instanceof Error ? falha.message : 'Erro ao carregar clientes.', 'erro')
    })
    return () => {
      montado.current = false
    }
  }, [])

  async function handleSubmit(evento: React.FormEvent) {
    evento.preventDefault()
    setErro(null)

    const resultado = schemaCliente.safeParse({ nome, contato: contato || undefined })
    if (!resultado.success) {
      setErro(resultado.error.issues[0]?.message ?? 'Dados inválidos')
      return
    }

    try {
      await criarCliente(resultado.data)
      if (!montado.current) return
      mostrarToast('Cliente cadastrado com sucesso')
      setNome('')
      setContato('')
      await recarregar()
    } catch (falha) {
      if (!montado.current) return
      mostrarToast(falha instanceof Error ? falha.message : 'Erro ao salvar.', 'erro')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Clientes</h1>
      <Card>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <TextField id="nome-cliente" rotulo="Nome do cliente" value={nome} onChange={(e) => setNome(e.target.value)} />
          <TextField id="contato-cliente" rotulo="Contato" value={contato} onChange={(e) => setContato(e.target.value)} />
          {erro && <p role="alert" className="text-sm text-[var(--color-danger)]">{erro}</p>}
          <Button type="submit">Cadastrar cliente</Button>
        </form>
      </Card>

      {clientes.length === 0 ? (
        <EmptyState titulo="Nenhum cliente cadastrado" descricao="Cadastre o primeiro cliente do seu ateliê." />
      ) : (
        <ul className="flex flex-col gap-2">
          {clientes.map((cliente) => (
            <Card key={cliente.id}>
              <p className="font-medium">{cliente.nome}</p>
              {cliente.contato && <p className="text-sm text-[var(--color-ink-muted)]">{cliente.contato}</p>}
            </Card>
          ))}
        </ul>
      )}
    </div>
  )
}
