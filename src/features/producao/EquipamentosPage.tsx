import { useEffect, useRef, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { TextField } from '../../components/ui/TextField'
import { EmptyState } from '../../components/ui/EmptyState'
import { ConfirmModal } from '../../components/ui/ConfirmModal'
import { useToast } from '../../components/ui/useToast'
import {
  criarEquipamento,
  listarEquipamentos,
  excluirEquipamento,
} from './equipamentosRepo'
import type { Equipamento } from '../../db/schema'

export function EquipamentosPage() {
  const { mostrarToast } = useToast()
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([])
  const [nome, setNome] = useState('')
  const [potenciaWatts, setPotenciaWatts] = useState('')
  const [custoKwh, setCustoKwh] = useState('0.85')
  const [equipamentoExcluindoId, setEquipamentoExcluindoId] = useState<number | null>(null)
  const montado = useRef(true)

  async function recarregar() {
    const lista = await listarEquipamentos()
    if (!montado.current) return
    setEquipamentos(lista)
  }

  useEffect(() => {
    montado.current = true
    recarregar().catch((err) => {
      if (montado.current) {
        mostrarToast(err instanceof Error ? err.message : 'Erro ao carregar equipamentos.', 'erro')
      }
    })
    return () => {
      montado.current = false
    }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nome.trim()) {
      mostrarToast('Informe o nome do equipamento', 'erro')
      return
    }
    const watts = Number(potenciaWatts)
    if (isNaN(watts) || watts <= 0) {
      mostrarToast('Informe uma potência em Watts válida (maior que 0)', 'erro')
      return
    }

    try {
      await criarEquipamento({
        nome: nome.trim(),
        potenciaWatts: watts,
      })

      mostrarToast('Equipamento cadastrado com sucesso!')
      setNome('')
      setPotenciaWatts('')
      await recarregar()
    } catch (err) {
      mostrarToast(err instanceof Error ? err.message : 'Erro ao cadastrar equipamento.', 'erro')
    }
  }

  async function handleExcluir(id: number) {
    try {
      await excluirEquipamento(id)
      mostrarToast('Equipamento excluído!')
      setEquipamentoExcluindoId(null)
      await recarregar()
    } catch (err) {
      mostrarToast(err instanceof Error ? err.message : 'Erro ao excluir equipamento.', 'erro')
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-on-surface">Equipamentos & Energia (kWh)</h1>
        <p className="text-label-sm text-on-surface-variant">
          Estufas de cura, panelas de vácuo, câmaras UV e lixadeiras/politrizes.
        </p>
      </div>

      <Card>
        <h2 className="mb-3 font-medium text-on-surface">Novo Equipamento</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <TextField
            id="nome-equipamento"
            rotulo="Nome do Equipamento (ex: Estufa Térmica 40W)"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />
          <TextField
            id="potencia-equipamento"
            rotulo="Potência (Watts)"
            type="number"
            value={potenciaWatts}
            onChange={(e) => setPotenciaWatts(e.target.value)}
          />
          <Button type="submit">Cadastrar Equipamento</Button>
        </form>
      </Card>

      <Card className="bg-surface-variant/30">
        <h2 className="mb-2 font-medium text-on-surface">Simulador Rápido de Energia</h2>
        <p className="text-xs text-on-surface-variant mb-3">
          Estime o custo elétrico direto na precificação das suas peças.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 items-end">
          <div className="w-full sm:w-1/2">
            <TextField
              id="tarifa-kwh"
              rotulo="Tarifa Média da Região (R$ / kWh)"
              type="number"
              value={custoKwh}
              onChange={(e) => setCustoKwh(e.target.value)}
            />
          </div>
        </div>
      </Card>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-on-surface">Equipamentos Cadastrados</h2>
        {equipamentos.length === 0 ? (
          <EmptyState
            titulo="Nenhum equipamento cadastrado"
            descricao="Cadastre suas estufas, câmara UV ou bombas de vácuo para incluir custo elétrico nas peças."
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {equipamentos.map((eq) => {
              const tarifa = Number(custoKwh) || 0.85
              const custoHora = (eq.potenciaWatts / 1000) * tarifa
              return (
                <Card key={eq.id} className="glow-hover">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-medium text-on-surface">{eq.nome}</h3>
                      <p className="text-label-sm text-on-surface-variant mt-1">
                        Potência: <strong>{eq.potenciaWatts} W</strong> ({eq.potenciaWatts / 1000} kW)
                      </p>
                      <p className="text-xs text-primary font-medium mt-1">
                        Custo estimado por hora de uso: R$ {custoHora.toFixed(2)}/h (à tarifa de R$ {tarifa.toFixed(2)}/kWh)
                      </p>
                    </div>
                    <Button variante="ghost" onClick={() => setEquipamentoExcluindoId(eq.id ?? null)}>
                      Excluir
                    </Button>
                  </div>
                </Card>
              )
            })}
          </ul>
        )}
      </section>

      <ConfirmModal
        aberto={equipamentoExcluindoId !== null}
        titulo="Excluir equipamento?"
        descricao="Esta ação não pode ser desfeita."
        onConfirmar={() => equipamentoExcluindoId !== null && handleExcluir(equipamentoExcluindoId)}
        onCancelar={() => setEquipamentoExcluindoId(null)}
      />
    </div>
  )
}
