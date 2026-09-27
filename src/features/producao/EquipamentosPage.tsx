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
  const [valorCompra, setValorCompra] = useState('')
  const [descricao, setDescricao] = useState('')
  const [vidaUtilHoras, setVidaUtilHoras] = useState('')
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
        valorCompra: valorCompra ? Number(valorCompra) : undefined,
        descricao: descricao.trim() || undefined,
        vidaUtilHoras: vidaUtilHoras ? Number(vidaUtilHoras) : undefined,
      })

      mostrarToast('Equipamento cadastrado com sucesso!')
      setNome('')
      setPotenciaWatts('')
      setValorCompra('')
      setDescricao('')
      setVidaUtilHoras('')
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
        <h1 className="text-xl font-semibold text-on-surface">Caixa de Ferramentas & Maquinário</h1>
        <p className="text-label-sm text-on-surface-variant">
          Cadastre suas ferramentas e equipamentos de consumo (lâmpada UV, secador, soprador, furadeira, politriz).
        </p>
      </div>

      <Card>
        <h2 className="mb-3 font-medium text-on-surface">Cadastrar Novo Equipamento</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <TextField
              id="nome-equipamento"
              rotulo="Nome do Equipamento (ex: Politriz 600W, Lâmpada UV, Furadeira)"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />
            <TextField
              id="potencia-equipamento"
              rotulo="Potência (Watts - Consumo)"
              type="number"
              value={potenciaWatts}
              onChange={(e) => setPotenciaWatts(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <TextField
              id="valor-compra-equipamento"
              rotulo="Valor de Compra (R$)"
              type="number"
              step="0.01"
              placeholder="Ex: 250.00"
              value={valorCompra}
              onChange={(e) => setValorCompra(e.target.value)}
            />
            <TextField
              id="vida-util-equipamento"
              rotulo="Tempo de Vida Útil (Horas de Uso)"
              type="number"
              placeholder="Ex: 1000"
              value={vidaUtilHoras}
              onChange={(e) => setVidaUtilHoras(e.target.value)}
            />
          </div>

          <TextField
            id="descricao-equipamento"
            rotulo="O que faz / Função (ex: Lixamento d'água, secagem, cura de UV)"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
          />

          <Button type="submit">Cadastrar Equipamento</Button>
        </form>
      </Card>

      <Card className="bg-surface-variant/30">
        <h2 className="mb-2 font-medium text-on-surface">Simulador Rápido de Custo Elétrico</h2>
        <p className="text-xs text-on-surface-variant mb-3">
          Estime o custo elétrico direto na precificação dos seus produtos.
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
        <h2 className="mb-2 text-sm font-semibold text-on-surface">Equipamentos Cadastrados na Caixa de Ferramentas</h2>
        {equipamentos.length === 0 ? (
          <EmptyState
            titulo="Nenhum equipamento cadastrado"
            descricao="Cadastre suas lâmpadas, furadeiras, secadores, sopradores e politrizes para calcular o uso elétrico na precificação."
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {equipamentos.map((eq) => {
              const tarifa = Number(custoKwh) || 0.85
              const custoHora = (eq.potenciaWatts / 1000) * tarifa
              return (
                <Card key={eq.id} className="glow-hover">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-col gap-1">
                      <h3 className="font-medium text-on-surface">{eq.nome}</h3>
                      {eq.descricao && (
                        <p className="text-xs text-on-surface-variant">
                          <strong>Função:</strong> {eq.descricao}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-label-sm text-on-surface-variant mt-1">
                        <span>Potência: <strong>{eq.potenciaWatts} W</strong> ({eq.potenciaWatts / 1000} kW)</span>
                        {eq.valorCompra !== undefined && eq.valorCompra > 0 && (
                          <span>Custo de Aquisição: <strong>R$ {eq.valorCompra.toFixed(2)}</strong></span>
                        )}
                        {eq.vidaUtilHoras !== undefined && eq.vidaUtilHoras > 0 && (
                          <span>Vida Útil: <strong>{eq.vidaUtilHoras}h</strong></span>
                        )}
                      </div>
                      <p className="text-xs text-primary font-medium mt-1">
                        Custo elétrico por hora de uso: R$ {custoHora.toFixed(2)}/h (à tarifa de R$ {tarifa.toFixed(2)}/kWh)
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
