import { useEffect, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { z } from 'zod'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { TextField } from '../../components/ui/TextField'
import { Badge } from '../../components/ui/Badge'
import { EmptyState } from '../../components/ui/EmptyState'
import { ConfirmModal } from '../../components/ui/ConfirmModal'
import { useToast } from '../../components/ui/useToast'
import { criarPeca, listarPecas, excluirPeca, type PecaComForma } from './pecasRepo'
import { listarFormas } from './formasRepo'
import { listarMateriais } from './materiaisRepo'
import type { Forma, Material } from '../../db/schema'

const schemaPeca = z.object({
  nome: z.string().trim().min(1, 'Informe o nome da peça').max(120),
})

interface LinhaConsumo {
  materialId: string
  quantidade: string
}

function linhaVazia(): LinhaConsumo {
  return { materialId: '', quantidade: '' }
}

export function PecasPage() {
  const { mostrarToast } = useToast()
  const [pecas, setPecas] = useState<PecaComForma[]>([])
  const [formas, setFormas] = useState<Forma[]>([])
  const [materiais, setMateriais] = useState<Material[]>([])
  const [nome, setNome] = useState('')
  const [formaId, setFormaId] = useState('')
  const [consumos, setConsumos] = useState<LinhaConsumo[]>([linhaVazia()])
  const [erro, setErro] = useState<string | null>(null)
  const [pecaExcluindoId, setPecaExcluindoId] = useState<number | null>(null)

  const montado = useRef(true)

  async function recarregar() {
    const [pecasCarregadas, formasCarregadas, materiaisCarregados] = await Promise.all([
      listarPecas(),
      listarFormas(),
      listarMateriais(),
    ])
    if (!montado.current) return
    setPecas(pecasCarregadas)
    setFormas(formasCarregadas)
    setMateriais(materiaisCarregados)
  }

  useEffect(() => {
    montado.current = true
    recarregar().catch((falha) => {
      if (!montado.current) return
      mostrarToast(falha instanceof Error ? falha.message : 'Erro ao carregar peças.', 'erro')
    })
    return () => {
      montado.current = false
    }
  }, [])

  function limparFormulario() {
    setNome('')
    setFormaId('')
    setConsumos([linhaVazia()])
    setErro(null)
  }

  function atualizarLinha(indice: number, campo: keyof LinhaConsumo, valor: string) {
    setConsumos((atual) => atual.map((linha, i) => (i === indice ? { ...linha, [campo]: valor } : linha)))
  }

  function adicionarLinha() {
    setConsumos((atual) => [...atual, linhaVazia()])
  }

  function removerLinha(indice: number) {
    setConsumos((atual) => atual.filter((_, i) => i !== indice))
  }

  async function handleSubmit(evento: React.FormEvent) {
    evento.preventDefault()
    setErro(null)

    const resultado = schemaPeca.safeParse({ nome })
    if (!resultado.success) {
      setErro(resultado.error.issues[0]?.message ?? 'Dados inválidos')
      return
    }
    if (!formaId) {
      setErro('Selecione uma forma')
      return
    }

    const linhasValidas = consumos.filter((linha) => linha.materialId && Number(linha.quantidade) > 0)
    if (linhasValidas.length === 0) {
      setErro('Adicione ao menos um material com quantidade maior que zero')
      return
    }

    try {
      await criarPeca({
        nome: resultado.data.nome,
        formaId: Number(formaId),
        consumos: linhasValidas.map((linha) => ({
          materialId: Number(linha.materialId),
          quantidade: Number(linha.quantidade),
        })),
      })
    } catch (falha) {
      if (!montado.current) return
      mostrarToast(falha instanceof Error ? falha.message : 'Erro ao salvar.', 'erro')
      return
    }
    if (!montado.current) return
    mostrarToast('Peça cadastrada com sucesso')
    limparFormulario()
    await recarregar()
  }

  async function handleExcluir(pecaId: number) {
    try {
      await excluirPeca(pecaId)
    } catch (falha) {
      if (!montado.current) return
      mostrarToast(falha instanceof Error ? falha.message : 'Erro ao excluir peça.', 'erro')
      return
    }
    if (!montado.current) return
    mostrarToast('Peça excluída com sucesso')
    setPecaExcluindoId(null)
    await recarregar()
  }

  const faltamPreRequisitos = formas.length === 0 || materiais.length === 0

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Peças</h1>
      <Card>
        {faltamPreRequisitos && (
          <p role="alert" className="mb-3 text-sm text-[var(--color-ink-muted)]">
            Cadastre pelo menos um material e uma forma antes de criar uma peça.
          </p>
        )}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <TextField id="nome-peca" rotulo="Nome da peça" value={nome} onChange={(e) => setNome(e.target.value)} />

          <label htmlFor="forma-peca" className="text-sm font-medium">Forma</label>
          <select id="forma-peca" value={formaId} onChange={(e) => setFormaId(e.target.value)} className="rounded-lg px-3 py-2 elevation-inset">
            <option value="">Selecione</option>
            {formas.map((forma) => (
              <option key={forma.id} value={forma.id}>{forma.nome}</option>
            ))}
          </select>

          <p className="text-sm font-medium">Materiais consumidos</p>
          {consumos.map((linha, indice) => (
            <div key={indice} className="flex items-end gap-2">
              <div className="flex flex-1 flex-col gap-1">
                <label htmlFor={`material-peca-${indice}`} className="text-sm font-medium">Material</label>
                <select
                  id={`material-peca-${indice}`}
                  value={linha.materialId}
                  onChange={(e) => atualizarLinha(indice, 'materialId', e.target.value)}
                  className="rounded-lg px-3 py-2 elevation-inset"
                >
                  <option value="">Selecione</option>
                  {materiais.map((material) => (
                    <option key={material.id} value={material.id}>{material.nome}</option>
                  ))}
                </select>
              </div>
              <TextField
                id={`quantidade-peca-${indice}`}
                rotulo="Quantidade"
                type="number"
                value={linha.quantidade}
                onChange={(e) => atualizarLinha(indice, 'quantidade', e.target.value)}
              />
              {consumos.length > 1 && (
                <Button type="button" variante="ghost" onClick={() => removerLinha(indice)}>×</Button>
              )}
            </div>
          ))}
          <Button type="button" variante="ghost" onClick={adicionarLinha}>+ Adicionar material</Button>

          {erro && <p role="alert" className="text-sm text-[var(--color-danger)]">{erro}</p>}
          <Button type="submit" disabled={faltamPreRequisitos}>Cadastrar peça</Button>
        </form>
      </Card>

      {pecas.length === 0 ? (
        <EmptyState titulo="Nenhuma peça cadastrada" descricao="Cadastre a primeira peça em produção." />
      ) : (
        <ul className="flex flex-col gap-2">
          {pecas.map((peca) => (
            <Card key={peca.id} className="flex items-center justify-between">
              <Link to="/pecas/$pecaId" params={{ pecaId: String(peca.id) }} className="flex-1">
                <p className="font-medium">{peca.nome}</p>
                <p className="text-sm text-[var(--color-ink-muted)]">{peca.nomeForma}</p>
              </Link>
              <div className="flex items-center gap-2">
                <Badge variant="neutral">{peca.status}</Badge>
                <Button variante="ghost" onClick={() => setPecaExcluindoId(peca.id ?? null)}>Excluir</Button>
              </div>
            </Card>
          ))}
        </ul>
      )}

      <ConfirmModal
        aberto={pecaExcluindoId !== null}
        titulo="Excluir peça?"
        descricao="O material consumido volta ao estoque."
        onConfirmar={() => pecaExcluindoId !== null && handleExcluir(pecaExcluindoId)}
        onCancelar={() => setPecaExcluindoId(null)}
      />
    </div>
  )
}
