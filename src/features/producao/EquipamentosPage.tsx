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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          <div className="flex flex-col gap-3">
            {equipamentos.map((eq) => {
              const tarifa = Number(custoKwh) || 0.85
              const custoHora = (eq.potenciaWatts / 1000) * tarifa
              return (
                <Card key={eq.id} className="glow-hover flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4">
                  <div className="flex items-start sm:items-center gap-3.5 flex-1 min-w-0">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary text-base font-bold">
                      ⚡
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-on-surface text-base truncate">{eq.nome}</h3>
                        <span className="text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                          {eq.potenciaWatts} W
                        </span>
                      </div>
                      {eq.descricao && (
                        <p className="text-xs text-on-surface-variant mt-0.5">
                          {eq.descricao}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-on-surface-variant mt-1">
                        {eq.valorCompra !== undefined && eq.valorCompra > 0 && (
                          <span>Aquisição: <strong>R$ {eq.valorCompra.toFixed(2)}</strong></span>
                        )}
                        {eq.vidaUtilHoras !== undefined && eq.vidaUtilHoras > 0 && (
                          <span>Vida Útil: <strong>{eq.vidaUtilHoras}h</strong></span>
                        )}
                        <span className="text-primary font-medium">
                          ⚡ R$ {custoHora.toFixed(2)}/h
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-outline-variant/30 justify-end">
                    <Button variante="ghost" className="text-xs text-error hover:bg-error/10" onClick={() => setEquipamentoExcluindoId(eq.id ?? null)}>
                      Excluir
                    </Button>
                  </div>
                </Card>
              )
            })}
          </div>
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
