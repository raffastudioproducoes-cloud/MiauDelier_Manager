import { useEffect, useMemo, useRef, useState } from 'react'
import { liveQuery } from 'dexie'
import { getRouteApi } from '@tanstack/react-router'
import { z } from 'zod'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import { ConfirmModal } from '../../components/ui/ConfirmModal'
import { TextField } from '../../components/ui/TextField'
import { useToast } from '../../components/ui/useToast'
import {
  listarPecas,
  listarConsumosDaPeca,
  listarEventosDaPeca,
  atualizarStatusPeca,
  registrarVendaPeca,
  atualizarImagemPeca,
  editarConsumosPeca,
  type PecaComForma,
  type ConsumoComMaterial,
} from './pecasRepo'
import { SeletorImagem } from '../../components/ui/SeletorImagem'
import { listarContas } from '../financeiro/contasRepo'
import { obterTarifasConfig } from '../pricing/tarifasConfigRepo'
import { calcularPrecificacao } from '../pricing/pricing'
import { formatarVolumeEMassaLegivel, obterOpcoesUnidadeCompativeis } from '../../lib/unidades'
import { listarMateriais } from './materiaisRepo'
import { listarFormas } from './formasRepo'
import { listarEquipamentos } from './equipamentosRepo'
import { ERRO_CONEXAO_ESTOQUE, mensagemEstoqueInsuficiente } from './estoque'
import { useConexaoEstoque } from './useConexaoEstoque'
import {
  calcularRestanteCura,
  calcularProgressoCura,
  formatarTempoRestanteCura,
  adicionarTempoCura,
} from './curaRepo'
import type { Equipamento, EventoPeca, Forma, Material, StatusPeca } from '../../db/schema'

const routeApi = getRouteApi('/pecas/$pecaId')

const OPCOES_STATUS: StatusPeca[] = ['planejada', 'em_producao', 'curando', 'acabamento', 'pronta', 'vendida', 'cancelada']

const schemaValorVenda = z.coerce.number().min(0.01, 'Informe um valor de venda maior que zero')

export function PecaDetalhePage() {
  const { pecaId } = routeApi.useParams()
  const { mostrarToast } = useToast()
  const conectado = useConexaoEstoque()
  const [peca, setPeca] = useState<PecaComForma | undefined>(undefined)
  const [consumos, setConsumos] = useState<ConsumoComMaterial[]>([])
  const [materiais, setMateriais] = useState<Material[]>([])
  const [formas, setFormas] = useState<Forma[]>([])
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([])
  const [eventos, setEventos] = useState<EventoPeca[]>([])
  const [tarifaKwh, setTarifaKwh] = useState(0.85)
  const [valorHoraMaoDeObra, setValorHoraMaoDeObra] = useState(25)
  const [carregado, setCarregado] = useState(false)
  const [vendaAberta, setVendaAberta] = useState(false)
  const [valorVenda, setValorVenda] = useState('')
  const [erroValorVenda, setErroValorVenda] = useState<string | null>(null)

  const [editandoEtapas, setEditandoEtapas] = useState(false)
  const [editNome, setEditNome] = useState('')
  const [editVolume, setEditVolume] = useState('')
  const [editCura, setEditCura] = useState('')
  const [editForma, setEditForma] = useState('')
  const [editEquipamentos, setEditEquipamentos] = useState<{ equipamentoId: string; minutos: string }[]>([])
  const [editConsumos, setEditConsumos] = useState<{ materialId: string; quantidade: string; unidade: string }[]>([])
  const [editHorasMaoDeObra, setEditHorasMaoDeObra] = useState('')
  const [editValorPropagandaTotal, setEditValorPropagandaTotal] = useState('')
  const [editDiasPropaganda, setEditDiasPropaganda] = useState('')
  const [editValorFrete, setEditValorFrete] = useState('')
  const [editPercentualTaxas, setEditPercentualTaxas] = useState('')
  const [editMargemDesejada, setEditMargemDesejada] = useState('')
  const [editLitrosAgua, setEditLitrosAgua] = useState('')
  const [editCustoEpiInsumos, setEditCustoEpiInsumos] = useState('')

  const [addCuraAberto, setAddCuraAberto] = useState(false)
  const [addCuraValor, setAddCuraValor] = useState('')
  const [addCuraUnidade, setAddCuraUnidade] = useState<'dias' | 'horas' | 'minutos'>('horas')

  const [agora, setAgora] = useState(() => Date.now())

  const montado = useRef(true)
  const abriuEdicaoAutomatica = useRef(false)
  const id = Number(pecaId)

  useEffect(() => {
    const observacao = liveQuery(() => listarMateriais()).subscribe({ next: setMateriais, error: (falha) => mostrarToast(falha instanceof Error ? falha.message : 'Erro ao acompanhar estoque.', 'erro') })
    return () => observacao.unsubscribe()
  }, [mostrarToast])

  useEffect(() => {
    const timer = setInterval(() => {
      setAgora(Date.now())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  async function recarregar() {
    const [pecas, consumosCarregados, eventosCarregados, tarifasConfig, materiaisCarregados, formasCarregadas, equipamentosCarregados] = await Promise.all([
      listarPecas(),
      listarConsumosDaPeca(id),
      listarEventosDaPeca(id),
      obterTarifasConfig(),
      listarMateriais(),
      listarFormas(),
      listarEquipamentos(),
    ])
    if (!montado.current) return
    const pecaEncontrada = pecas.find((p) => p.id === id)
    setPeca(pecaEncontrada)
    setConsumos(consumosCarregados)
    setMateriais(materiaisCarregados)
    setFormas(formasCarregadas)
    setEquipamentos(equipamentosCarregados)
    setEventos(eventosCarregados)
    setTarifaKwh(tarifasConfig.tarifaKwh || 0.85)
    setValorHoraMaoDeObra(tarifasConfig.valorHoraMaoDeObra || 25)

    if (pecaEncontrada) {
      setEditNome(pecaEncontrada.nome)
      setEditForma(String(pecaEncontrada.formaId))
      setEditEquipamentos((pecaEncontrada.usosEnergia ?? []).map(uso => ({ equipamentoId: String(uso.equipamentoId), minutos: String(uso.minutosUso) })))
      setEditVolume(pecaEncontrada.volumeResinaMl !== undefined ? String(pecaEncontrada.volumeResinaMl) : '')
      setEditCura(pecaEncontrada.curaMinutos !== undefined ? String(pecaEncontrada.curaMinutos) : '')
      setEditConsumos(consumosCarregados.map(c => ({ materialId: String(c.materialId), quantidade: String(c.quantidade), unidade: c.unidade ?? '' })))
      setEditHorasMaoDeObra(pecaEncontrada.horasMaoDeObra ? String(pecaEncontrada.horasMaoDeObra) : '')
      setEditValorPropagandaTotal(pecaEncontrada.valorPropagandaTotal ? String(pecaEncontrada.valorPropagandaTotal) : '')
      setEditDiasPropaganda(pecaEncontrada.diasPropaganda ? String(pecaEncontrada.diasPropaganda) : '')
      setEditValorFrete(pecaEncontrada.valorFrete ? String(pecaEncontrada.valorFrete) : '')
      setEditPercentualTaxas(pecaEncontrada.percentualTaxas !== undefined ? String(pecaEncontrada.percentualTaxas) : '0')
      setEditMargemDesejada(pecaEncontrada.margemDesejada !== undefined ? String(pecaEncontrada.margemDesejada) : '50')
      setEditLitrosAgua(pecaEncontrada.litrosAgua ? String(pecaEncontrada.litrosAgua) : '')
      setEditCustoEpiInsumos(pecaEncontrada.custoEpiInsumos ? String(pecaEncontrada.custoEpiInsumos) : '')
      if (!abriuEdicaoAutomatica.current && window.location.hash === '#editar') {
        abriuEdicaoAutomatica.current = true
        setEditandoEtapas(true)
      }
    }

    setCarregado(true)
  }

  const errosReativacao = useMemo(() => {
    if (peca?.status !== 'cancelada') return []
    const totais = new Map<number, number>()
    for (const consumo of consumos) totais.set(consumo.materialId, (totais.get(consumo.materialId) ?? 0) + consumo.quantidade)
    const erros = [...totais].flatMap(([materialId, quantidade]) => {
      const material = materiais.find((item) => item.id === materialId)
      if (!material) return [`Material ${materialId} não encontrado no estoque.`]
      const erro = mensagemEstoqueInsuficiente(material, quantidade)
      return erro ? [erro] : []
    })
    if (!conectado && totais.size > 0) erros.push(ERRO_CONEXAO_ESTOQUE)
    return erros
  }, [peca, consumos, materiais, conectado])

  useEffect(() => {
    montado.current = true
    // eslint-disable-next-line react-hooks/set-state-in-effect
    recarregar().catch((falha) => {
      if (!montado.current) return
      mostrarToast(falha instanceof Error ? falha.message : 'Erro ao carregar peça.', 'erro')
    })
    return () => {
      montado.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pecaId])

  const custoMateriaisTotal = useMemo(() => {
    return consumos.reduce((total, c) => total + c.quantidade * (c.custoUnitarioNoConsumo ?? materiais.find(m => m.id === c.materialId)?.custoUnitario ?? 0), 0)
  }, [consumos, materiais])

  const custoPropagandaDia = useMemo(() => {
    if (!peca) return 0
    const val = peca.valorPropagandaTotal || 0
    const dias = peca.diasPropaganda || 0
    if (val > 0 && dias > 0) return val / dias
    return 0
  }, [peca])

  const precificacaoRes = useMemo(() => {
    if (!peca) return null
    const custoAcc = (peca.custoEpiInsumos || 0) + custoPropagandaDia + (peca.valorFrete || 0)
    const forma = formas.find(item => item.id === peca.formaId)
    const custoForma = forma?.vidaUtilUsos && forma.vidaUtilUsos > 0 ? (forma.custoFabricacao ?? 0) / forma.vidaUtilUsos : 0
    try { return calcularPrecificacao({
      custoMaterial: custoMateriaisTotal,
      custoAcessorios: custoAcc,
      horasProducao: peca.horasMaoDeObra || 0,
      valorHora: valorHoraMaoDeObra,
      rateioFixoPercent: 0,
      margemLucroPercent: peca.margemDesejada ?? 50,
      usosEnergia: peca.usosEnergia || [],
      tarifaKwh,
      litrosAgua: peca.litrosAgua || 0,
      custoForma,
      percentualTaxas: peca.percentualTaxas || 0,
    }) } catch { return null }
  }, [peca, custoMateriaisTotal, custoPropagandaDia, valorHoraMaoDeObra, tarifaKwh, formas])

  async function handleMudarStatus(novoStatus: StatusPeca) {
    if (novoStatus === 'vendida') {
      setValorVenda(peca?.precoVenda ? String(peca.precoVenda) : (precificacaoRes ? String(precificacaoRes.precoFinal.toFixed(2)) : ''))
      setErroValorVenda(null)
      setVendaAberta(true)
      return
    }
    try {
      await atualizarStatusPeca(id, novoStatus)
    } catch (falha) {
      if (!montado.current) return
      mostrarToast(falha instanceof Error ? falha.message : 'Erro ao atualizar status.', 'erro')
      return
    }
    if (!montado.current) return
    await recarregar()
  }

  async function handleConfirmarVenda() {
    const resultado = schemaValorVenda.safeParse(valorVenda)
    if (!resultado.success) {
      setErroValorVenda(resultado.error.issues[0]?.message ?? 'Valor inválido')
      return
    }
    setErroValorVenda(null)

    try {
      const contas = await listarContas()
      if (contas.length === 0) {
        mostrarToast('Cadastre uma conta antes de registrar uma venda.', 'erro')
        return
      }
      await registrarVendaPeca(id, resultado.data, contas[0].id, `Venda: ${peca?.nome ?? ''}`)
    } catch (falha) {
      if (!montado.current) return
      mostrarToast(falha instanceof Error ? falha.message : 'Erro ao registrar venda.', 'erro')
      return
    }
    if (!montado.current) return
    mostrarToast('Venda registrada com sucesso')
    setVendaAberta(false)
    await recarregar()
  }

  async function handleSalvarImagem(novaUrl?: string) {
    try {
      await atualizarImagemPeca(id, novaUrl)
      await recarregar()
      mostrarToast('Imagem da peça salva!', 'sucesso')
    } catch {
      mostrarToast('Erro ao salvar imagem da peça.', 'erro')
    }
  }

  async function handleSalvarEtapas() {
    try {
      const vProp = Number(editValorPropagandaTotal) || 0
      const dProp = Number(editDiasPropaganda) || 0
      const cProp = vProp > 0 && dProp > 0 ? vProp / dProp : 0

      if (!editNome.trim()) throw new Error('Informe o nome da peça.')
      if ([editVolume, editCura, editHorasMaoDeObra, editValorPropagandaTotal, editDiasPropaganda, editValorFrete, editPercentualTaxas, editMargemDesejada, editLitrosAgua, editCustoEpiInsumos].some(v => v.trim() !== '' && (!Number.isFinite(Number(v)) || Number(v) < 0))) throw new Error('Informe valores numéricos não negativos.')
      if (editConsumos.some(c => !c.materialId || !Number.isFinite(Number(c.quantidade)) || Number(c.quantidade) <= 0)) throw new Error('Informe um material e uma quantidade válida para cada linha.')
      if (!editForma) throw new Error('Selecione uma forma.')
      const usosEnergia = editEquipamentos.map(linha => {
        const eq = equipamentos.find(item => item.id === Number(linha.equipamentoId))
        const minutos = Number(linha.minutos)
        if (!eq || !Number.isFinite(minutos) || minutos <= 0) throw new Error('Informe equipamento e tempo válidos.')
        return { equipamentoId: eq.id!, nomeEquipamento: eq.nome, potenciaWatts: eq.potenciaWatts, minutosUso: minutos }
      })
      await editarConsumosPeca(id, editConsumos.map(c => ({ materialId: Number(c.materialId), quantidade: Number(c.quantidade), unidade: c.unidade })), {
        nome: editNome.trim(),
        formaId: Number(editForma),
        usosEnergia,
        volumeResinaMl: Number(editVolume) || undefined,
        curaMinutos: Number(editCura) || undefined,
        horasMaoDeObra: Number(editHorasMaoDeObra) || undefined,
        valorPropagandaTotal: vProp || undefined,
        diasPropaganda: dProp || undefined,
        custoPropagandaCalculado: cProp || undefined,
        valorFrete: Number(editValorFrete) || undefined,
        percentualTaxas: Number(editPercentualTaxas) || 0,
        margemDesejada: editMargemDesejada.trim() === '' ? 50 : Number(editMargemDesejada),
        litrosAgua: Number(editLitrosAgua) || undefined,
        custoEpiInsumos: Number(editCustoEpiInsumos) || undefined,
      })
      mostrarToast('Etapas e precificação atualizadas!', 'sucesso')
      setEditandoEtapas(false)
      await recarregar()
    } catch (falha) {
      mostrarToast(falha instanceof Error ? falha.message : 'Erro ao atualizar etapas da peça.', 'erro')
    }
  }

  async function handleConfirmarAdicionarCura() {
    const val = Number(addCuraValor)
    if (!val || val <= 0) {
      mostrarToast('Informe um valor válido para adicionar ao tempo de cura', 'erro')
      return
    }
    let minAdicionais = val
    if (addCuraUnidade === 'dias') minAdicionais = Math.round(val * 24 * 60)
    else if (addCuraUnidade === 'horas') minAdicionais = Math.round(val * 60)

    try {
      await adicionarTempoCura(id, minAdicionais)
      mostrarToast('Tempo de cura adicionado com sucesso!')
      setAddCuraAberto(false)
      setAddCuraValor('')
      setAddCuraUnidade('horas')
      await recarregar()
    } catch (falha) {
      mostrarToast(falha instanceof Error ? falha.message : 'Erro ao adicionar tempo de cura.', 'erro')
    }
  }

  if (!carregado) return null

  if (!peca) {
    return <EmptyState titulo="Peça não encontrada" descricao="Ela pode ter sido excluída." />
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-outline-variant/30 pb-4">
        <div>
          <h1 className="text-xl font-semibold text-on-surface">{peca.nome}</h1>
          <p className="mt-1 text-label-sm text-on-surface-variant">
            Forma: {peca.nomeForma} · Série: <span className="font-mono">{peca.numeroSerie}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={peca.status === 'cancelada' ? 'danger' : peca.status === 'vendida' ? 'success' : peca.status === 'curando' ? 'warning' : 'neutral'}>
            {peca.status.toUpperCase()}
          </Badge>
          <label htmlFor="status-peca" className="sr-only">Status</label>
          <select
            id="status-peca"
            value={peca.status}
            onChange={(e) => handleMudarStatus(e.target.value as StatusPeca)}
            className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
          >
            {OPCOES_STATUS.map((status) => (
              <option key={status} value={status} disabled={peca.status === 'cancelada' && status !== 'cancelada' && errosReativacao.length > 0}>{status.toUpperCase()}</option>
            ))}
          </select>
        </div>
      </div>

      {peca.status === 'cancelada' && (
        <div role="alert" className="rounded-xl border border-error/30 bg-error/10 p-4 text-sm text-error">
          <strong>Produção Cancelada:</strong> Os materiais consumidos foram devolvidos ao estoque e o uso do molde foi estornado.
        </div>
      )}
      {errosReativacao.map((mensagem) => <p key={mensagem} role="alert" className="rounded-lg border border-error bg-error/10 p-3 text-sm font-medium text-error">{mensagem}</p>)}

      {/* DISCRIMINAÇÃO POR ETAPAS DE PRODUÇÃO */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Painel Etapa 1 & 2 */}
        <Card className="flex flex-col gap-4">
          <h2 className="font-semibold text-sm text-on-surface border-b border-outline-variant/30 pb-2 flex items-center justify-between">
            <span>✨ Etapa 1 & 2: Molde, Mistura & Cura</span>
            {peca.volumeResinaMl && (() => {
              const fmt = formatarVolumeEMassaLegivel(peca.volumeResinaMl)
              return (
                <span className="text-xs font-mono font-normal text-violet-400">
                  {fmt.volumeLegivel} ({fmt.massaLegivel})
                </span>
              )
            })()}
          </h2>

          <div className="flex flex-col gap-2 text-xs">
            <div className="flex justify-between border-b border-outline-variant/20 pb-1.5">
              <span className="text-on-surface-variant">Forma:</span>
              <strong className="text-on-surface">{peca.nomeForma}</strong>
            </div>
            {peca.volumeResinaMl && (() => {
              const fmt = formatarVolumeEMassaLegivel(peca.volumeResinaMl)
              return (
                <div className="flex justify-between border-b border-outline-variant/20 pb-1.5">
                  <span className="text-on-surface-variant">Volume Real de Resina:</span>
                  <strong className="text-on-surface font-mono">{fmt.resumoExtenso}</strong>
                </div>
              )
            })()}
            <div className="flex justify-between border-b border-outline-variant/20 pb-1.5">
              <span className="text-on-surface-variant">Tempo de Cura Total Registrado:</span>
              <strong className="text-on-surface">
                {peca.curaMinutos ? formatarTempoRestanteCura(peca.curaMinutos * 60_000) : 'Não especificado'}
              </strong>
            </div>
          </div>

          {peca.curaMinutos && peca.curaIniciadaEm && (() => {
            const restanteCura = calcularRestanteCura(peca, agora)
            const progressoCura = calcularProgressoCura(peca, agora) * 100
            const curaConcluida = restanteCura <= 0

            return (
              <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-3 flex flex-col gap-2 my-1">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-amber-300 flex items-center gap-1">
                    {curaConcluida ? '✅ Cura Concluída!' : '⏳ Cronômetro de Cura em Andamento'}
                  </span>
                  <span className="font-mono text-amber-400">
                    {curaConcluida ? 'Concluída' : `Faltam ${formatarTempoRestanteCura(restanteCura)}`}
                  </span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden border border-amber-500/20">
                  <div
                    className={`h-full transition-all duration-500 ${curaConcluida ? 'bg-emerald-500' : 'bg-amber-500'}`}
                    style={{ width: `${progressoCura}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>{progressoCura.toFixed(0)}% concluído</span>
                  <Button
                    type="button"
                    variante="ghost"
                    onClick={() => {
                      setAddCuraAberto(true)
                      setAddCuraValor('')
                      setAddCuraUnidade('horas')
                    }}
                    className="text-amber-400 hover:text-amber-300 text-xs font-semibold py-0.5 px-2"
                  >
                    ➕ Adicionar Tempo de Cura
                  </Button>
                </div>
              </div>
            )
          })()}

          <div className="mt-1">
            <h3 className="text-xs font-semibold text-on-surface mb-2">Materiais Consumidos no Preparo</h3>
            {consumos.length === 0 ? (
              <p className="text-xs text-on-surface-variant">Nenhum consumo registrado.</p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {consumos.map((consumo, indice) => (
                  <li key={indice} className="text-xs text-on-surface-variant flex items-center justify-between bg-surface-container/30 px-2.5 py-1.5 rounded-lg border border-outline-variant/30">
                    <span>{consumo.nomeMaterial}: {consumo.quantidade} {consumo.unidade ?? ''}</span>
                    <strong className="text-on-surface font-mono">{consumo.quantidade} {consumo.unidade ?? ''}</strong>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        {/* Painel Etapa 3 & 4 */}
        <Card className="flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-outline-variant/30 pb-2">
            <h2 className="font-semibold text-sm text-on-surface">🪚 Etapa 3 & 4: Acabamento, Mão de Obra & Comercial</h2>
            <Button variante="ghost" onClick={() => setEditandoEtapas(true)} className="text-xs">
              ✏️ Editar Etapas
            </Button>
          </div>

          <div className="flex flex-col gap-2 text-xs">
            <div className="flex justify-between border-b border-outline-variant/20 pb-1.5">
              <span className="text-on-surface-variant">Mão de Obra Ativa:</span>
              <strong className="text-on-surface">{peca.horasMaoDeObra ? `${peca.horasMaoDeObra} horas (R$ ${(peca.horasMaoDeObra * valorHoraMaoDeObra).toFixed(2)})` : '0h'}</strong>
            </div>
            <div className="flex justify-between border-b border-outline-variant/20 pb-1.5">
              <span className="text-on-surface-variant">Consumo de Água:</span>
              <strong className="text-on-surface">{peca.litrosAgua ? `${peca.litrosAgua} Litros` : '0 L'}</strong>
            </div>
            <div className="flex justify-between border-b border-outline-variant/20 pb-1.5">
              <span className="text-on-surface-variant">Consumíveis & EPIs:</span>
              <strong className="text-on-surface font-mono">R$ {(peca.custoEpiInsumos || 0).toFixed(2)}</strong>
            </div>
            <div className="flex justify-between border-b border-outline-variant/20 pb-1.5">
              <span className="text-on-surface-variant">Rateio de Propaganda/Anúncio:</span>
              <strong className="text-blue-400 font-mono">
                {custoPropagandaDia > 0 ? `R$ ${custoPropagandaDia.toFixed(2)} / dia` : 'Sem propaganda'}
              </strong>
            </div>
            <div className="flex justify-between border-b border-outline-variant/20 pb-1.5">
              <span className="text-on-surface-variant">Frete / Embalagem Individual:</span>
              <strong className="text-on-surface font-mono">R$ {(peca.valorFrete || 0).toFixed(2)}</strong>
            </div>
          </div>

          {precificacaoRes && (
            <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/20 p-3 flex flex-col gap-2 mt-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-300">Preço Sugerido com Margem ({peca.margemDesejada || 50}%)</span>
                <strong className="text-sm font-mono text-emerald-400">R$ {precificacaoRes.precoFinal.toFixed(2)}</strong>
              </div>
              <div className="flex justify-between text-[11px] text-slate-300">
                <span>Custo Direto: R$ {precificacaoRes.custoDireto.toFixed(2)}</span>
                <span>Lucro Bruto: R$ {precificacaoRes.lucro.toFixed(2)}</span>
              </div>
            </div>
          )}
          {!precificacaoRes && <p role="alert" className="text-xs text-error">Não foi possível calcular o preço. Confira os dados e a taxa da peça.</p>}
        </Card>
      </div>

      <Card>
        <h2 className="mb-3 font-medium text-on-surface">Foto da Peça (Vitrine & WhatsApp)</h2>
        <SeletorImagem
          imagemUrl={peca.imagemUrl}
          onImagemSelecionada={handleSalvarImagem}
          label="Foto da peça (capturada pela câmera ou da galeria)"
        />
      </Card>

      <Card>
        <h2 className="mb-2 font-medium text-on-surface">Histórico de eventos do ledger</h2>
        {eventos.length === 0 ? (
          <p className="text-sm text-on-surface-variant">Nenhum evento registrado.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {eventos.map((evento) => (
              <li key={evento.id} className="text-xs text-on-surface-variant bg-surface-container/20 p-2.5 rounded-lg border border-outline-variant/30 flex items-center justify-between">
                <span><strong>{evento.tipo}:</strong> {evento.descricao}</span>
                <span className="text-[10px] text-slate-500">{new Date(evento.criadoEm).toLocaleString('pt-BR')}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <ConfirmModal
        aberto={editandoEtapas}
        titulo="Editar Parâmetros de Produção & Custos"
        descricao="Atualize os dados da peça; os materiais serão ajustados pela diferença no estoque."
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        onConfirmar={handleSalvarEtapas}
        onCancelar={() => { setEditandoEtapas(false); void recarregar().catch(() => mostrarToast('Erro ao recarregar peça.', 'erro')) }}
      >
        <div className="flex flex-col gap-3 text-left">
          <h3 className="text-sm font-semibold text-on-surface">Etapas 1 e 2: molde, materiais e cura</h3>
          <TextField id="edit-nome-peca" rotulo="Nome da peça" value={editNome} onChange={(e) => setEditNome(e.target.value)} />
          <div className="flex flex-col gap-1"><label htmlFor="edit-forma-peca" className="text-xs font-medium text-on-surface">Forma</label><select id="edit-forma-peca" value={editForma} onChange={e => setEditForma(e.target.value)} className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface">{formas.filter(f => f.id === peca.formaId || f.status === undefined || f.status === 'pronta').map(f => <option key={f.id} value={String(f.id)}>{f.nome}</option>)}</select></div>
          <TextField id="edit-volume-peca" rotulo="Volume real de resina (ml)" type="number" min="0" value={editVolume} onChange={(e) => setEditVolume(e.target.value)} />
          <TextField id="edit-cura-peca" rotulo="Tempo de cura (minutos)" type="number" min="0" value={editCura} onChange={(e) => setEditCura(e.target.value)} />
          <h3 className="text-sm font-semibold text-on-surface">Materiais e EPIs consumidos</h3>
          {editConsumos.map((linha, indice) => {
            const material = materiais.find(m => m.id === Number(linha.materialId))
            const atualizar = (dados: Partial<typeof linha>) => setEditConsumos(atuais => atuais.map((item, i) => i === indice ? { ...item, ...dados } : item))
            return <div key={indice} className="flex flex-wrap items-end gap-2 rounded-xl border border-outline-variant/60 p-3">
              <div className="flex flex-1 min-w-[160px] flex-col gap-1">
                <label htmlFor={`edit-material-${indice}`} className="text-xs font-medium text-on-surface">Material</label>
                <select id={`edit-material-${indice}`} value={linha.materialId} onChange={e => { const m = materiais.find(item => item.id === Number(e.target.value)); atualizar({ materialId: e.target.value, unidade: m?.unidade ?? '' }) }} className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface">
                  <option value="">Selecione o material...</option>
                  {materiais.map(m => <option key={m.id} value={String(m.id)}>{m.nome} ({m.quantidadeEstoque} {m.unidade} em estoque)</option>)}
                </select>
              </div>
              <div className="w-28"><TextField id={`edit-quantidade-${indice}`} rotulo="Quantidade" type="number" min="0" step="0.001" value={linha.quantidade} onChange={e => atualizar({ quantidade: e.target.value })} /></div>
              <div className="flex w-24 flex-col gap-1"><label htmlFor={`edit-unidade-${indice}`} className="text-xs font-medium text-on-surface">Unidade</label><select id={`edit-unidade-${indice}`} value={linha.unidade} onChange={e => atualizar({ unidade: e.target.value })} className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface">{(material ? obterOpcoesUnidadeCompativeis(material.unidade) : ['']).map(u => <option key={u} value={u}>{u}</option>)}</select></div>
              <Button type="button" variante="ghost" aria-label={`Remover material ${indice + 1}`} onClick={() => setEditConsumos(atuais => atuais.filter((_, i) => i !== indice))}>×</Button>
            </div>
          })}
          <Button type="button" variante="ghost" onClick={() => setEditConsumos(atuais => [...atuais, { materialId: '', quantidade: '', unidade: '' }])}>+ Adicionar material ou EPI</Button>
          <h3 className="text-sm font-semibold text-on-surface">Etapas 2 e 3: equipamentos utilizados</h3>
          {editEquipamentos.map((linha, indice) => <div key={indice} className="flex flex-wrap items-end gap-2 rounded-xl border border-outline-variant/60 p-3">
            <div className="flex flex-1 min-w-[160px] flex-col gap-1"><label htmlFor={`edit-equipamento-${indice}`} className="text-xs font-medium text-on-surface">Equipamento</label><select id={`edit-equipamento-${indice}`} value={linha.equipamentoId} onChange={e => setEditEquipamentos(atuais => atuais.map((item, i) => i === indice ? { ...item, equipamentoId: e.target.value } : item))} className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface"><option value="">Selecione...</option>{equipamentos.map(eq => <option key={eq.id} value={String(eq.id)}>{eq.nome} ({eq.potenciaWatts} W)</option>)}</select></div>
            <div className="w-32"><TextField id={`edit-minutos-${indice}`} rotulo="Tempo (minutos)" type="number" min="0" value={linha.minutos} onChange={e => setEditEquipamentos(atuais => atuais.map((item, i) => i === indice ? { ...item, minutos: e.target.value } : item))} /></div>
            <Button type="button" variante="ghost" aria-label={`Remover equipamento ${indice + 1}`} onClick={() => setEditEquipamentos(atuais => atuais.filter((_, i) => i !== indice))}>×</Button>
          </div>)}
          <Button type="button" variante="ghost" onClick={() => setEditEquipamentos(atuais => [...atuais, { equipamentoId: '', minutos: '' }])}>+ Adicionar equipamento</Button>
          <h3 className="text-sm font-semibold text-on-surface">Etapas 3 e 4: acabamento e custos</h3>
          <TextField
            id="edit-horas-mo"
            rotulo="Horas de Mão de Obra Ativa (h)"
            type="number"
            step="0.25"
            value={editHorasMaoDeObra}
            onChange={(e) => setEditHorasMaoDeObra(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-2">
            <TextField
              id="edit-propaganda-val"
              rotulo="Valor Propaganda (R$)"
              type="number"
              step="1"
              value={editValorPropagandaTotal}
              onChange={(e) => setEditValorPropagandaTotal(e.target.value)}
            />
            <TextField
              id="edit-propaganda-dias"
              rotulo="Dias Campanha"
              type="number"
              step="1"
              value={editDiasPropaganda}
              onChange={(e) => setEditDiasPropaganda(e.target.value)}
            />
          </div>
          <TextField id="edit-margem-peca" rotulo="Margem desejada (%)" type="number" min="0" value={editMargemDesejada} onChange={e => setEditMargemDesejada(e.target.value)} />
          <div className="grid grid-cols-2 gap-2">
            <TextField
              id="edit-frete"
              rotulo="Frete Individual (R$)"
              type="number"
              step="0.5"
              value={editValorFrete}
              onChange={(e) => setEditValorFrete(e.target.value)}
            />
            <TextField
              id="edit-taxas"
              rotulo="Taxa Loja/Site (%)"
              type="number"
              step="0.5"
              value={editPercentualTaxas}
              onChange={(e) => setEditPercentualTaxas(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <TextField
              id="edit-agua"
              rotulo="Água (Litros)"
              type="number"
              step="0.5"
              value={editLitrosAgua}
              onChange={(e) => setEditLitrosAgua(e.target.value)}
            />
            <TextField
              id="edit-epis"
              rotulo="EPIs & Acabamento (R$)"
              type="number"
              step="0.5"
              value={editCustoEpiInsumos}
              onChange={(e) => setEditCustoEpiInsumos(e.target.value)}
            />
          </div>
        </div>
      </ConfirmModal>

      <ConfirmModal
        aberto={vendaAberta}
        titulo="Confirmar venda"
        descricao="Registrar venda por este valor? Uma transação de entrada será criada no financeiro cifrado."
        onConfirmar={handleConfirmarVenda}
        onCancelar={() => setVendaAberta(false)}
      >
        <TextField
          id="valor-venda"
          rotulo="Valor da venda"
          type="number"
          step="0.01"
          value={valorVenda}
          onChange={(e) => setValorVenda(e.target.value)}
          erro={erroValorVenda ?? undefined}
        />
      </ConfirmModal>

      <ConfirmModal
        aberto={addCuraAberto}
        titulo="➕ Adicionar Tempo de Cura"
        descricao="Adicione mais dias, horas ou minutos ao cronômetro de cura desta peça."
        onConfirmar={handleConfirmarAdicionarCura}
        onCancelar={() => setAddCuraAberto(false)}
      >
        <div className="flex gap-2 items-end pt-2 text-left">
          <div className="flex-1">
            <TextField
              id="add-cura-val-det"
              rotulo="Tempo a Adicionar"
              type="number"
              step="0.5"
              value={addCuraValor}
              onChange={(e) => setAddCuraValor(e.target.value)}
              placeholder="Ex: 1 (dia), 12 (horas)"
            />
          </div>
          <div className="flex flex-col gap-1 w-32">
            <label htmlFor="add-cura-unidade-det" className="text-xs font-medium text-on-surface">Unidade</label>
            <select
              id="add-cura-unidade-det"
              value={addCuraUnidade}
              onChange={(e) => setAddCuraUnidade(e.target.value as any)}
              className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="dias">Dias</option>
              <option value="horas">Horas</option>
              <option value="minutos">Minutos</option>
            </select>
          </div>
        </div>
      </ConfirmModal>
    </div>
  )
}
