import { useEffect, useRef, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { TextField } from '../../components/ui/TextField'
import { Badge } from '../../components/ui/Badge'
import { EmptyState } from '../../components/ui/EmptyState'
import { useToast } from '../../components/ui/useToast'
import { criarPeca, listarPecas, type PecaComForma } from './pecasRepo'
import { listarFormas } from './formasRepo'
import { listarMateriais } from './materiaisRepo'
import type { Forma, Material } from '../../db/schema'

export function PecasPage() {
  const { mostrarToast } = useToast()
  const [pecas, setPecas] = useState<PecaComForma[]>([])
  const [formas, setFormas] = useState<Forma[]>([])
  const [materiais, setMateriais] = useState<Material[]>([])
  const [nome, setNome] = useState('')
  const [formaId, setFormaId] = useState('')
  const [materialId, setMaterialId] = useState('')
  const [quantidade, setQuantidade] = useState('')

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
    recarregar().catch(() => {})
    return () => {
      montado.current = false
    }
  }, [])

  async function handleSubmit(evento: React.FormEvent) {
    evento.preventDefault()
    if (!nome.trim() || !formaId || !materialId || !quantidade) return

    try {
      await criarPeca({
        nome,
        formaId: Number(formaId),
        consumos: [{ materialId: Number(materialId), quantidade: Number(quantidade) }],
      })
    } catch (falha) {
      if (!montado.current) return
      mostrarToast(falha instanceof Error ? falha.message : 'Erro ao salvar.', 'erro')
      return
    }
    if (!montado.current) return
    mostrarToast('Peça cadastrada com sucesso')
    setNome('')
    setFormaId('')
    setMaterialId('')
    setQuantidade('')
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

          <label htmlFor="material-peca" className="text-sm font-medium">Material</label>
          <select id="material-peca" value={materialId} onChange={(e) => setMaterialId(e.target.value)} className="rounded-lg px-3 py-2 elevation-inset">
            <option value="">Selecione</option>
            {materiais.map((material) => (
              <option key={material.id} value={material.id}>{material.nome}</option>
            ))}
          </select>

          <TextField id="quantidade-consumida" rotulo="Quantidade consumida" type="number" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} />

          <Button type="submit" disabled={faltamPreRequisitos}>Cadastrar peça</Button>
        </form>
      </Card>

      {pecas.length === 0 ? (
        <EmptyState titulo="Nenhuma peça cadastrada" descricao="Cadastre a primeira peça em produção." />
      ) : (
        <ul className="flex flex-col gap-2">
          {pecas.map((peca) => (
            <Card key={peca.id} className="flex items-center justify-between">
              <div>
                <p className="font-medium">{peca.nome}</p>
                <p className="text-sm text-[var(--color-ink-muted)]">{peca.nomeForma}</p>
              </div>
              <Badge variant="neutral">{peca.status}</Badge>
            </Card>
          ))}
        </ul>
      )}
    </div>
  )
}
