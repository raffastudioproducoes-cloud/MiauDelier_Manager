import { useEffect, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { z } from 'zod'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { TextField } from '../../components/ui/TextField'
import { EmptyState } from '../../components/ui/EmptyState'
import { ConfirmModal } from '../../components/ui/ConfirmModal'
import { useToast } from '../../components/ui/useToast'
import {
  criarCliente,
  listarClientes,
  atualizarCliente,
  excluirCliente,
  type ClienteDecifrado,
} from './clientesRepo'

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
  const [busca, setBusca] = useState('')
  const [editandoId, setEditandoId] = useState<number | null>(null)
  const [clienteParaExcluir, setClienteParaExcluir] = useState<ClienteDecifrado | null>(null)

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

  function cancelarEdicao() {
    setEditandoId(null)
    setNome('')
    setContato('')
    setErro(null)
  }

  function iniciarEdicao(cliente: ClienteDecifrado) {
    setEditandoId(cliente.id)
    setNome(cliente.nome)
    setContato(cliente.contato ?? '')
    setErro(null)
  }

  async function handleSubmit(evento: React.FormEvent) {
    evento.preventDefault()
    setErro(null)

    const resultado = schemaCliente.safeParse({ nome, contato: contato || undefined })
    if (!resultado.success) {
      setErro(resultado.error.issues[0]?.message ?? 'Dados inválidos')
      return
    }

    try {
      if (editandoId !== null) {
        await atualizarCliente(editandoId, resultado.data)
        if (!montado.current) return
        mostrarToast('Cliente atualizado com sucesso')
      } else {
        await criarCliente(resultado.data)
        if (!montado.current) return
        mostrarToast('Cliente cadastrado com sucesso')
      }
      cancelarEdicao()
      await recarregar()
    } catch (falha) {
      if (!montado.current) return
      mostrarToast(falha instanceof Error ? falha.message : 'Erro ao salvar.', 'erro')
    }
  }

  async function handleExcluir() {
    if (!clienteParaExcluir) return
    try {
      await excluirCliente(clienteParaExcluir.id)
      if (!montado.current) return
      mostrarToast('Cliente excluído com sucesso')
      setClienteParaExcluir(null)
      await recarregar()
    } catch (falha) {
      if (!montado.current) return
      mostrarToast(falha instanceof Error ? falha.message : 'Erro ao excluir.', 'erro')
    }
  }

  const clientesFiltrados = clientes.filter((cliente) =>
    cliente.nome.toLowerCase().includes(busca.toLowerCase()),
  )

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Clientes</h1>
      <Card>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <TextField id="nome-cliente" rotulo="Nome do cliente" value={nome} onChange={(e) => setNome(e.target.value)} />
          <TextField id="contato-cliente" rotulo="Contato" value={contato} onChange={(e) => setContato(e.target.value)} />
          {erro && <p role="alert" className="text-sm text-[var(--color-danger)]">{erro}</p>}
          <div className="flex gap-2">
            <Button type="submit">{editandoId !== null ? 'Salvar alterações' : 'Cadastrar cliente'}</Button>
            {editandoId !== null && (
              <Button type="button" variante="ghost" onClick={cancelarEdicao}>
                Cancelar
              </Button>
            )}
          </div>
        </form>
      </Card>

      <TextField
        id="busca-cliente"
        rotulo="Buscar cliente"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
      />

      {clientesFiltrados.length === 0 ? (
        <EmptyState
          titulo={clientes.length === 0 ? 'Nenhum cliente cadastrado' : 'Nenhum cliente encontrado'}
          descricao="Cadastre o primeiro cliente do seu ateliê."
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {clientesFiltrados.map((cliente) => (
            <Card key={cliente.id}>
              <div className="flex items-center justify-between gap-2">
                <Link to="/clientes/$clienteId" params={{ clienteId: String(cliente.id) }} className="flex-1">
                  <p className="font-medium">{cliente.nome}</p>
                  {cliente.contato && <p className="text-sm text-[var(--color-ink-muted)]">{cliente.contato}</p>}
                </Link>
                <div className="flex gap-2">
                  <Button variante="ghost" onClick={() => iniciarEdicao(cliente)}>
                    Editar
                  </Button>
                  <Button variante="ghost" onClick={() => setClienteParaExcluir(cliente)}>
                    Excluir
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </ul>
      )}

      <ConfirmModal
        aberto={clienteParaExcluir !== null}
        titulo="Excluir cliente"
        descricao={`Tem certeza que deseja excluir "${clienteParaExcluir?.nome}"? Essa ação não pode ser desfeita.`}
        onConfirmar={handleExcluir}
        onCancelar={() => setClienteParaExcluir(null)}
      />
    </div>
  )
}
