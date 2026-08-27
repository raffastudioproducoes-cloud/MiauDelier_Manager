import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { TextField } from '../../components/ui/TextField'
import { EmptyState } from '../../components/ui/EmptyState'
import { useToast } from '../../components/ui/useToast'
import { calcularVolumeMl } from '../calculator/volume'
import { criarForma, listarFormas } from './formasRepo'
import type { Forma } from '../../db/schema'

export function FormasPage() {
  const { mostrarToast } = useToast()
  const [formas, setFormas] = useState<Forma[]>([])
  const [nome, setNome] = useState('')
  const [raio, setRaio] = useState('')
  const [altura, setAltura] = useState('')

  const montado = useRef(true)

  async function recarregar() {
    const formasCarregadas = await listarFormas()
    if (!montado.current) return
    setFormas(formasCarregadas)
  }

  useEffect(() => {
    montado.current = true
    recarregar()
    return () => {
      montado.current = false
    }
  }, [])

  const volumeCalculado = useMemo(() => {
    const raioNumero = Number(raio)
    const alturaNumero = Number(altura)
    if (!raioNumero || !alturaNumero) return null
    try {
      return calcularVolumeMl({ geometria: 'cilindrico', raio: raioNumero, altura: alturaNumero })
    } catch {
      return null
    }
  }, [raio, altura])

  async function handleSubmit(evento: React.FormEvent) {
    evento.preventDefault()
    if (!nome.trim() || volumeCalculado === null) return

    await criarForma({
      nome,
      geometria: 'cilindrico',
      dimensoesCm: { raio: Number(raio), altura: Number(altura) },
    })
    if (!montado.current) return
    mostrarToast('Forma cadastrada com sucesso')
    setNome('')
    setRaio('')
    setAltura('')
    await recarregar()
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Formas</h1>
      <Card>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <TextField id="nome-forma" rotulo="Nome da forma" value={nome} onChange={(e) => setNome(e.target.value)} />
          <TextField id="raio-forma" rotulo="Raio (cm)" type="number" value={raio} onChange={(e) => setRaio(e.target.value)} />
          <TextField id="altura-forma" rotulo="Altura (cm)" type="number" value={altura} onChange={(e) => setAltura(e.target.value)} />
          <p className="text-sm text-[var(--color-ink-muted)]">
            Volume calculado: <strong>{volumeCalculado !== null ? `${volumeCalculado.toFixed(1)} ml` : '—'}</strong>
          </p>
          <Button type="submit" disabled={volumeCalculado === null || !nome.trim()}>Cadastrar forma</Button>
        </form>
      </Card>

      {formas.length === 0 ? (
        <EmptyState titulo="Nenhuma forma cadastrada" descricao="Cadastre o primeiro molde do seu ateliê." />
      ) : (
        <ul className="flex flex-col gap-2">
          {formas.map((forma) => (
            <Card key={forma.id}>
              <p className="font-medium">{forma.nome}</p>
            </Card>
          ))}
        </ul>
      )}
    </div>
  )
}
