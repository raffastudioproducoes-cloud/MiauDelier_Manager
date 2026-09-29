import { useEffect, useMemo, useRef, useState } from 'react'
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
import { listarEquipamentos } from './equipamentosRepo'
import { obterTarifasConfig } from '../pricing/tarifasConfigRepo'
import { calcularPrecificacao } from '../pricing/pricing'
import { calcularVolumeTotalForma } from '../calculator/volume'
import type { Forma, Material, Equipamento, UsoEnergiaPeca } from '../../db/schema'
import { converterQuantidade, obterOpcoesUnidadeCompativeis, formatarVolumeEMassaLegivel } from '../../lib/unidades'
import { SeletorImagem } from '../../components/ui/SeletorImagem'
import { VitrinePecasProntas } from './VitrinePecasProntas'
import {
  calcularRestanteCura,
  calcularProgressoCura,
  formatarTempoRestanteCura,
  adicionarTempoCura,
  verificarCurasConcluidas,
} from './curaRepo'

const schemaPeca = z.object({
  nome: z.string().trim().min(1, 'Informe o nome da peça').max(120),
})

interface LinhaConsumo {
  materialId: string
  quantidade: string
  unidade: string
}

interface LinhaConsumo {
  materialId: string
  quantidade: string
  unidade: string
}

interface LinhaUsoEquipamento {
  equipamentoId: string
  valorUso: string
  unidadeUso: 'minutos' | 'horas' | 'dias'
}

function linhaConsumoVazia(): LinhaConsumo {
  return { materialId: '', quantidade: '', unidade: '' }
}

function linhaEquipamentoVazia(): LinhaUsoEquipamento {
  return { equipamentoId: '', valorUso: '', unidadeUso: 'minutos' }
}

export function PecasPage() {
  const { mostrarToast } = useToast()
  const [pecas, setPecas] = useState<PecaComForma[]>([])
  const [formas, setFormas] = useState<Forma[]>([])
  const [materiais, setMateriais] = useState<Material[]>([])
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([])
  const [tarifaKwh, setTarifaKwh] = useState(0.85)
  const [valorHoraMaoDeObra, setValorHoraMaoDeObra] = useState(25)

  const [etapaFormulario, setEtapaFormulario] = useState<1 | 2 | 3 | 4>(1)

  const [nome, setNome] = useState('')
  const [formaId, setFormaId] = useState('')
  const [volumeResinaMl, setVolumeResinaMl] = useState('')
  const [consumos, setConsumos] = useState<LinhaConsumo[]>([linhaConsumoVazia()])

  const [valorTempoCura, setValorTempoCura] = useState('')
  const [unidadeTempoCura, setUnidadeTempoCura] = useState<'dias' | 'horas' | 'minutos'>('horas')
  const [usosEnergiaCura, setUsosEnergiaCura] = useState<LinhaUsoEquipamento[]>([linhaEquipamentoVazia()])

  const [usosEnergiaAcabamento, setUsosEnergiaAcabamento] = useState<LinhaUsoEquipamento[]>([linhaEquipamentoVazia()])
  const [horasMaoDeObra, setHorasMaoDeObra] = useState('')
  const [litrosAgua, setLitrosAgua] = useState('')
  const [custoEpiInsumos, setCustoEpiInsumos] = useState('')

  const [percentualTaxas, setPercentualTaxas] = useState('0')
  const [margemLucroPercent, setMargemLucroPercent] = useState('50')
  const [valorPropagandaTotal, setValorPropagandaTotal] = useState('')
  const [diasPropaganda, setDiasPropaganda] = useState('')
  const [valorFrete, setValorFrete] = useState('')
  const [imagemUrl, setImagemUrl] = useState<string | undefined>(undefined)

  const [abaAtiva, setAbaAtiva] = useState<'lista' | 'vitrine'>('lista')
  const [erro, setErro] = useState<string | null>(null)
  const [pecaExcluindoId, setPecaExcluindoId] = useState<number | null>(null)
  const [carregado, setCarregado] = useState(false)

  const [agora, setAgora] = useState(() => Date.now())
  const [pecaAdicionarCuraId, setPecaAdicionarCuraId] = useState<number | null>(null)
  const [addCuraValor, setAddCuraValor] = useState('')
  const [addCuraUnidade, setAddCuraUnidade] = useState<'dias' | 'horas' | 'minutos'>('horas')

  const montado = useRef(true)

  async function recarregar() {
    const [pecasCarregadas, formasCarregadas, materiaisCarregados, equipCarregados, tarifasConfig] = await Promise.all([
      listarPecas(),
      listarFormas(),
      listarMateriais(),
      listarEquipamentos(),
      obterTarifasConfig(),
    ])
    if (!montado.current) return
    setPecas(pecasCarregadas)
    setFormas(formasCarregadas)
    setMateriais(materiaisCarregados)
    setEquipamentos(equipCarregados)
    setTarifaKwh(tarifasConfig.tarifaKwh || 0.85)
    setValorHoraMaoDeObra(tarifasConfig.valorHoraMaoDeObra || 25)
  }

  useEffect(() => {
    montado.current = true
    recarregar()
      .then(() => {
        if (!montado.current) return
        setCarregado(true)
      })
      .catch((falha) => {
        if (!montado.current) return
        mostrarToast(falha instanceof Error ? falha.message : 'Erro ao carregar peças.', 'erro')
        setCarregado(true)
      })
    return () => {
      montado.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const timer = setInterval(() => {
      setAgora(Date.now())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (carregado) {
      verificarCurasConcluidas().then((concluidas) => {
        if (concluidas.length > 0) {
          mostrarToast(`${concluidas.length} peça(s) concluíram o tempo de cura!`, 'sucesso')
          recarregar()
        }
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agora, carregado])

  function limparFormulario() {
    setEtapaFormulario(1)
    setNome('')
    setFormaId('')
    setVolumeResinaMl('')
    setConsumos([linhaConsumoVazia()])
    setValorTempoCura('')
    setUnidadeTempoCura('horas')
    setUsosEnergiaCura([linhaEquipamentoVazia()])
    setUsosEnergiaAcabamento([linhaEquipamentoVazia()])
    setHorasMaoDeObra('')
    setLitrosAgua('')
    setCustoEpiInsumos('')
    setPercentualTaxas('0')
    setMargemLucroPercent('50')
    setValorPropagandaTotal('')
    setDiasPropaganda('')
    setValorFrete('')
    setImagemUrl(undefined)
    setErro(null)
  }

  const formaSelecionada = useMemo(() => {
    return formas.find((f) => String(f.id) === formaId)
  }, [formas, formaId])

  const volumeSugeridoMl = useMemo(() => {
    if (!formaSelecionada) return 0
    return calcularVolumeTotalForma(formaSelecionada)
  }, [formaSelecionada])

  function handleSelecionarForma(idFormaStr: string) {
    setFormaId(idFormaStr)
    const f = formas.find((item) => String(item.id) === idFormaStr)
    if (f) {
      const vol = calcularVolumeTotalForma(f)
      if (vol > 0) {
        setVolumeResinaMl(String(Math.round(vol)))
      }
    }
  }

  function atualizarLinhaConsumo(indice: number, campo: keyof LinhaConsumo, valor: string) {
    setConsumos((atual) => atual.map((linha, i) => (i === indice ? { ...linha, [campo]: valor } : linha)))
  }

  function selecionarMaterialNaLinha(indice: number, materialIdStr: string) {
    const mat = materiais.find((m) => m.id === Number(materialIdStr))
    setConsumos((atual) =>
      atual.map((linha, i) =>
        i === indice
          ? {
              ...linha,
              materialId: materialIdStr,
              unidade: mat ? mat.unidade : '',
            }
          : linha,
      ),
    )
  }

  function adicionarLinhaConsumo() {
    setConsumos((atual) => [...atual, linhaConsumoVazia()])
  }

  function removerLinhaConsumo(indice: number) {
    setConsumos((atual) => atual.filter((_, i) => i !== indice))
  }

  function atualizarLinhaEquipamento(
    setter: React.Dispatch<React.SetStateAction<LinhaUsoEquipamento[]>>,
    indice: number,
    campo: keyof LinhaUsoEquipamento,
    valor: string,
  ) {
    setter((atual) => atual.map((linha, i) => (i === indice ? { ...linha, [campo]: valor } : linha)))
  }

  const usosEnergiaConsolidados = useMemo<UsoEnergiaPeca[]>(() => {
    const lista: UsoEnergiaPeca[] = []
    const todasLinhas = [...usosEnergiaCura, ...usosEnergiaAcabamento]
    for (const linha of todasLinhas) {
      const val = Number(linha.valorUso)
      if (linha.equipamentoId && val > 0) {
        const eq = equipamentos.find((e) => e.id === Number(linha.equipamentoId))
        if (eq) {
          let minUso = val
          if (linha.unidadeUso === 'horas') minUso = val * 60
          else if (linha.unidadeUso === 'dias') minUso = val * 1440

          lista.push({
            equipamentoId: eq.id!,
            nomeEquipamento: eq.nome,
            potenciaWatts: eq.potenciaWatts,
            minutosUso: Math.round(minUso),
          })
        }
      }
    }
    return lista
  }, [usosEnergiaCura, usosEnergiaAcabamento, equipamentos])

  const custoMateriaisCalculado = useMemo(() => {
    let total = 0
    for (const linha of consumos) {
      if (!linha.materialId || !Number(linha.quantidade)) continue
      const mat = materiais.find((m) => m.id === Number(linha.materialId))
      if (!mat) continue
      const unidadeLinha = linha.unidade || mat.unidade
      const { quantidadeConvertida } = converterQuantidade(Number(linha.quantidade), unidadeLinha, mat.unidade)
      total += quantidadeConvertida * mat.custoUnitario
    }
    return total
  }, [consumos, materiais])

  const custoFormaAmortizacao = useMemo(() => {
    if (!formaSelecionada || !formaSelecionada.custoFabricacao || !formaSelecionada.vidaUtilUsos || formaSelecionada.vidaUtilUsos <= 0) {
      return 0
    }
    return formaSelecionada.custoFabricacao / formaSelecionada.vidaUtilUsos
  }, [formaSelecionada])

  const custoPropagandaDia = useMemo(() => {
    const val = Number(valorPropagandaTotal) || 0
    const dias = Number(diasPropaganda) || 0
    if (val > 0 && dias > 0) {
      return val / dias
    }
    return 0
  }, [valorPropagandaTotal, diasPropaganda])

  const precificacaoRes = useMemo(() => {
    const custoAcc = (Number(custoEpiInsumos) || 0) + custoPropagandaDia + (Number(valorFrete) || 0)
    return calcularPrecificacao({
      custoMaterial: custoMateriaisCalculado,
      custoAcessorios: custoAcc,
      horasProducao: Number(horasMaoDeObra) || 0,
      valorHora: valorHoraMaoDeObra,
      rateioFixoPercent: 0,
      margemLucroPercent: Number(margemLucroPercent) || 50,
      usosEnergia: usosEnergiaConsolidados,
      tarifaKwh,
      litrosAgua: Number(litrosAgua) || 0,
      custoForma: custoFormaAmortizacao,
      percentualTaxas: Number(percentualTaxas) || 0,
    })
  }, [
    custoMateriaisCalculado,
    custoEpiInsumos,
    custoPropagandaDia,
    valorFrete,
    horasMaoDeObra,
    valorHoraMaoDeObra,
    margemLucroPercent,
    usosEnergiaConsolidados,
    tarifaKwh,
    litrosAgua,
    custoFormaAmortizacao,
    percentualTaxas,
  ])

  async function handleConfirmarAdicionarCura() {
    if (!pecaAdicionarCuraId) return
    const val = Number(addCuraValor)
    if (!val || val <= 0) {
      mostrarToast('Informe um valor válido para adicionar ao tempo de cura', 'erro')
      return
    }
    let minAdicionais = val
    if (addCuraUnidade === 'dias') minAdicionais = Math.round(val * 24 * 60)
    else if (addCuraUnidade === 'horas') minAdicionais = Math.round(val * 60)

    try {
      await adicionarTempoCura(pecaAdicionarCuraId, minAdicionais)
      mostrarToast('Tempo de cura adicionado com sucesso!')
      setPecaAdicionarCuraId(null)
      setAddCuraValor('')
      setAddCuraUnidade('horas')
      await recarregar()
    } catch (falha) {
      mostrarToast(falha instanceof Error ? falha.message : 'Erro ao adicionar tempo de cura.', 'erro')
    }
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
      setEtapaFormulario(1)
      return
    }

    const linhasValidas = consumos.filter((linha) => linha.materialId && Number(linha.quantidade) > 0)
    if (linhasValidas.length === 0) {
      setErro('Adicione ao menos um material com quantidade maior que zero')
      setEtapaFormulario(1)
      return
    }

    try {
      let tempoCuraMin: number | undefined = undefined
      const valCura = Number(valorTempoCura)
      if (valCura > 0) {
        if (unidadeTempoCura === 'dias') tempoCuraMin = Math.round(valCura * 24 * 60)
        else if (unidadeTempoCura === 'horas') tempoCuraMin = Math.round(valCura * 60)
        else if (unidadeTempoCura === 'minutos') tempoCuraMin = Math.round(valCura)
      }

      await criarPeca({
        nome: resultado.data.nome,
        formaId: Number(formaId),
        volumeResinaMl: Number(volumeResinaMl) || undefined,
        consumos: linhasValidas.map((linha) => ({
          materialId: Number(linha.materialId),
          quantidade: Number(linha.quantidade),
          unidade: linha.unidade || undefined,
        })),
        curaMinutos: tempoCuraMin,
        horasMaoDeObra: Number(horasMaoDeObra) || undefined,
        usosEnergia: usosEnergiaConsolidados.length > 0 ? usosEnergiaConsolidados : undefined,
        litrosAgua: Number(litrosAgua) || undefined,
        custoEpiInsumos: Number(custoEpiInsumos) || undefined,
        valorPropagandaTotal: Number(valorPropagandaTotal) || undefined,
        diasPropaganda: Number(diasPropaganda) || undefined,
        custoPropagandaCalculado: custoPropagandaDia || undefined,
        valorFrete: Number(valorFrete) || undefined,
        precoVenda: precificacaoRes.precoFinal,
        percentualTaxas: Number(percentualTaxas) || 0,
        margemDesejada: Number(margemLucroPercent) || 50,
        imagemUrl: imagemUrl || undefined,
      })
    } catch (falha) {
      if (!montado.current) return
      mostrarToast(falha instanceof Error ? falha.message : 'Erro ao salvar peça.', 'erro')
      return
    }
    if (!montado.current) return
    mostrarToast('Peça cadastrada com sucesso!')
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

  const formasProntas = useMemo(() => {
    return formas.filter((f) => f.status === undefined || f.status === 'pronta')
  }, [formas])

  const materiaisConsumiveisPeca = useMemo(() => {
    return materiais.filter((m) => {
      const nomeUpper = m.nome.toUpperCase()
      if (nomeUpper.includes('SILICONE') || nomeUpper.includes('BORRACHA DE SILICONE')) {
        return false
      }
      return true
    })
  }, [materiais])

  const faltamPreRequisitos = formasProntas.length === 0 || materiaisConsumiveisPeca.length === 0

  if (!carregado) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl font-semibold text-on-surface">Peças</h1>
        <p className="text-sm text-on-surface-variant">Carregando...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-outline-variant/30 pb-4">
        <div>
          <h1 className="text-xl font-semibold text-on-surface">Peças & Vitrine</h1>
          <p className="text-label-sm text-on-surface-variant">Gestão por etapas de produção (Resina, Cura, Acabamento e Custos).</p>
        </div>

        <div className="flex bg-surface-container-high/40 p-1 rounded-xl border border-outline-variant/40">
          <button
            type="button"
            onClick={() => setAbaAtiva('lista')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
              abaAtiva === 'lista'
                ? 'bg-primary text-on-primary shadow-md'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            🧩 Todas as Peças
          </button>
          <button
            type="button"
            onClick={() => setAbaAtiva('vitrine')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
              abaAtiva === 'vitrine'
                ? 'bg-primary text-on-primary shadow-md'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span>🛍️ Vitrine - Peças Prontas</span>
            {pecas.filter((p) => p.status === 'pronta').length > 0 && (
              <span className="bg-emerald-500 text-slate-950 font-bold text-[10px] px-1.5 py-0.2 rounded-full">
                {pecas.filter((p) => p.status === 'pronta').length}
              </span>
            )}
          </button>
        </div>
      </div>

      {abaAtiva === 'vitrine' ? (
        <VitrinePecasProntas pecas={pecas} onRecarregar={recarregar} />
      ) : (
        <>
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 border-b border-outline-variant/30 pb-3">
          <h2 className="font-semibold text-base text-on-surface">Fabricar nova peça</h2>
          
          <div className="flex items-center gap-1.5 bg-surface-container-high/60 p-1 rounded-lg border border-outline-variant/40">
            <button
              type="button"
              onClick={() => setEtapaFormulario(1)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                etapaFormulario === 1 ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              1. Molde & Mistura
            </button>
            <span className="text-slate-600 text-xs">›</span>
            <button
              type="button"
              onClick={() => setEtapaFormulario(2)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                etapaFormulario === 2 ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              2. Cura & Bolhas
            </button>
            <span className="text-slate-600 text-xs">›</span>
            <button
              type="button"
              onClick={() => setEtapaFormulario(3)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                etapaFormulario === 3 ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              3. Desmolde & EPI
            </button>
            <span className="text-slate-600 text-xs">›</span>
            <button
              type="button"
              onClick={() => setEtapaFormulario(4)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                etapaFormulario === 4 ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              4. Custos & Preço
            </button>
          </div>
        </div>

        {faltamPreRequisitos && (
          <p role="alert" className="mb-3 text-sm text-on-surface-variant">
            Cadastre pelo menos um material e uma forma antes de criar uma peça.
          </p>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* ETAPA 1: MOLDE & MISTURA DE RESINA INICIAL */}
          {etapaFormulario === 1 && (
            <div className="flex flex-col gap-4 animate-fadeIn">
              <div className="bg-violet-950/20 border border-violet-800/40 p-3.5 rounded-xl">
                <h3 className="text-sm font-semibold text-violet-300 mb-1 flex items-center gap-1.5">
                  <span>✨ Etapa 1: Preparação do Molde & Mistura de Resina</span>
                </h3>
                <p className="text-xs text-slate-300">
                  Selecione a forma cadastrada. O sistema indicará a média de resina sugerida com base nas dimensões do molde.
                </p>
              </div>

              <TextField id="nome-peca" rotulo="Nome da peça" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Mesa Resinada Acrílica / Bandeja Organica" />

              <div className="flex flex-col gap-1">
                <label htmlFor="forma-peca" className="text-sm font-medium text-on-surface">Forma</label>
                <select
                  id="forma-peca"
                  value={formaId}
                  onChange={(e) => handleSelecionarForma(e.target.value)}
                  className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="">Selecione o molde...</option>
                  {formasProntas.map((forma) => (
                    <option key={forma.id} value={String(forma.id)}>
                      {forma.nome} {forma.custoFabricacao && forma.vidaUtilUsos ? `(Amortização: +R$ ${(forma.custoFabricacao / forma.vidaUtilUsos).toFixed(2)}/uso)` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {formaSelecionada && (() => {
                const infoFormatada = formatarVolumeEMassaLegivel(volumeSugeridoMl)
                return (
                  <div className="rounded-xl border border-primary/40 bg-primary/10 p-3.5 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                        📐 Volume Média Sugerido pela Forma
                      </span>
                      <span className="text-xs font-mono font-bold text-primary">
                        {infoFormatada.volumeLegivel}
                      </span>
                    </div>
                    <p className="text-xs text-on-surface-variant">
                      Molde &quot;{formaSelecionada.nome}&quot;: requer em média <strong>{infoFormatada.resumoExtenso}</strong>.
                    </p>
                  </div>
                )
              })()}

              <TextField
                id="volume-resina-peca"
                rotulo="Volume Real de Resina Utilizado (ml)"
                type="number"
                step="1"
                value={volumeResinaMl}
                onChange={(e) => setVolumeResinaMl(e.target.value)}
                placeholder="Ex: 500 (digite a quantidade usada)"
              />

              <div className="border-t border-outline-variant/30 pt-3">
                <p className="text-sm font-semibold text-on-surface mb-2">Materiais Consumidos no Preparo (Resina, Endurecedor, Dyes, Glitter, Flores)</p>
                {consumos.map((linha, indice) => {
                  const matSelecionado = materiaisConsumiveisPeca.find((m) => m.id === Number(linha.materialId))
                  const opcoesUnidade = matSelecionado ? obterOpcoesUnidadeCompativeis(matSelecionado.unidade) : ['un']
                  const unidadeLinha = linha.unidade || (matSelecionado?.unidade ?? '')

                  const qtdNum = Number(linha.quantidade) || 0
                  const temCalculo = matSelecionado && qtdNum > 0
                  const { quantidadeConvertida } = temCalculo
                    ? converterQuantidade(qtdNum, unidadeLinha, matSelecionado.unidade)
                    : { quantidadeConvertida: 0 }
                  const restante = matSelecionado ? matSelecionado.quantidadeEstoque - quantidadeConvertida : 0
                  const ehInsuficiente = temCalculo && restante < 0

                  return (
                    <div key={indice} className="flex flex-col gap-2 rounded-xl border border-outline-variant/60 bg-surface-container/30 p-3 mb-2">
                      <div className="flex flex-wrap items-end gap-2">
                        <div className="flex flex-1 min-w-[200px] flex-col gap-1">
                          <label htmlFor={`material-peca-${indice}`} className="text-xs font-medium text-on-surface">Material</label>
                          <select
                            id={`material-peca-${indice}`}
                            value={linha.materialId}
                            onChange={(e) => selecionarMaterialNaLinha(indice, e.target.value)}
                            className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                          >
                            <option value="">Selecione o insumo...</option>
                            {materiais.map((material) => (
                              <option key={material.id} value={String(material.id)}>

                                {material.nome} ({material.quantidadeEstoque} {material.unidade} em estoque)
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="w-32">
                          <TextField
                            id={`quantidade-peca-${indice}`}
                            rotulo="Quantidade"
                            type="number"
                            step="0.001"
                            value={linha.quantidade}
                            onChange={(e) => atualizarLinhaConsumo(indice, 'quantidade', e.target.value)}
                          />
                        </div>

                        <div className="flex flex-col gap-1 w-28">
                          <label htmlFor={`unidade-peca-${indice}`} className="text-xs font-medium text-on-surface">Unidade</label>
                          <select
                            id={`unidade-peca-${indice}`}
                            value={unidadeLinha}
                            onChange={(e) => atualizarLinhaConsumo(indice, 'unidade', e.target.value)}
                            className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                          >
                            {opcoesUnidade.map((u) => (
                              <option key={u} value={u}>{u}</option>
                            ))}
                          </select>
                        </div>

                        {consumos.length > 1 && (
                          <Button type="button" variante="ghost" onClick={() => removerLinhaConsumo(indice)} className="mb-0.5 text-error">×</Button>
                        )}
                      </div>

                      {temCalculo && matSelecionado && (
                        <p className={`text-xs ${ehInsuficiente ? 'text-error font-medium' : 'text-on-surface-variant'}`}>
                          {unidadeLinha !== matSelecionado.unidade
                            ? `Equivale a ${quantidadeConvertida.toFixed(3)} ${matSelecionado.unidade} do estoque. `
                            : ''}
                          {ehInsuficiente ? (
                            <span>⚠️ Estoque insuficiente! Disponível: {matSelecionado.quantidadeEstoque} {matSelecionado.unidade}</span>
                          ) : (
                            <span>Estoque após consumo: <strong>{restante.toFixed(3)} {matSelecionado.unidade}</strong></span>
                          )}
                        </p>
                      )}
                    </div>
                  )
                })}
                <Button type="button" variante="ghost" onClick={adicionarLinhaConsumo} className="text-xs font-medium">
                  + Adicionar material
                </Button>
              </div>

              <div className="flex justify-between items-center pt-2">
                <Button type="submit" disabled={faltamPreRequisitos} variante="primary">
                  Fabricar nova peça
                </Button>
                <Button type="button" variante="ghost" onClick={() => setEtapaFormulario(2)}>
                  Próxima Etapa: Cura & Bolhas →
                </Button>
              </div>
            </div>
          )}

          {/* ETAPA 2: TEMPO DE CURA & REMOÇÃO DE BOLHAS / EQUIPAMENTOS TÉRMICOS */}
          {etapaFormulario === 2 && (
            <div className="flex flex-col gap-4 animate-fadeIn">
              <div className="bg-amber-950/20 border border-amber-800/40 p-3.5 rounded-xl">
                <h3 className="text-sm font-semibold text-amber-300 mb-1 flex items-center gap-1.5">
                  <span>🔥 Etapa 2: Tempo de Cura & Remoção de Bolhas / Equipamentos Térmicos</span>
                </h3>
                <p className="text-xs text-slate-300">
                  Registre o tempo estimado de cura da resina. Se utilizou câmara de vácuo, canhão térmico, soprador ou estufa, selecione o equipamento e informe os minutos de uso para apuração do custo de energia elétrica.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <TextField
                      id="valor-tempo-cura"
                      rotulo="Tempo de Cura Estimado"
                      type="number"
                      step="0.5"
                      value={valorTempoCura}
                      onChange={(e) => setValorTempoCura(e.target.value)}
                      placeholder="Ex: 24 (horas) ou 7 (dias)"
                    />
                  </div>
                  <div className="flex flex-col gap-1 w-32">
                    <label htmlFor="unidade-tempo-cura" className="text-xs font-medium text-on-surface">Unidade</label>
                    <select
                      id="unidade-tempo-cura"
                      value={unidadeTempoCura}
                      onChange={(e) => setUnidadeTempoCura(e.target.value as 'dias' | 'horas' | 'minutos')}
                      className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="dias">Dias</option>
                      <option value="horas">Horas</option>
                      <option value="minutos">Minutos</option>
                    </select>
                  </div>
                </div>
                <div className="rounded-xl border border-outline-variant/40 bg-surface-container/30 p-3 flex flex-col justify-center">
                  <span className="text-xs font-semibold text-on-surface">💡 Dica Técnica de Cura</span>
                  <p className="text-[11px] text-on-surface-variant mt-1">
                    Resinas de baixa viscosidade ou para mesas altas costumam curar em 24h a 7 dias ou mais a 25°C dependendo da espessura e clima. O uso de estufa a 40°C–50°C acelera a cura para 6h–12h.
                  </p>
                </div>
              </div>

              <div className="border-t border-outline-variant/30 pt-3">
                <h4 className="text-sm font-semibold text-on-surface mb-2">Equipamentos Elétricos Usados no Preparo/Cura (Soprador, Canhão Térmico, Vácuo, Estufa)</h4>
                {usosEnergiaCura.map((linha, indice) => (
                  <div key={indice} className="flex flex-wrap items-end gap-2 mb-2 p-2.5 rounded-xl border border-outline-variant/40 bg-surface-container/20">
                    <div className="flex-1 min-w-[180px] flex flex-col gap-1">
                      <label htmlFor={`equipamento-cura-${indice}`} className="text-xs font-medium text-on-surface">Equipamento</label>
                      <select
                        id={`equipamento-cura-${indice}`}
                        value={linha.equipamentoId}
                        onChange={(e) => atualizarLinhaEquipamento(setUsosEnergiaCura, indice, 'equipamentoId', e.target.value)}
                        className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="">Selecione o equipamento...</option>
                        {equipamentos.map((eq) => (
                          <option key={eq.id} value={String(eq.id)}>
                            {eq.nome} ({eq.potenciaWatts}W)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="w-28">
                      <TextField
                        id={`valor-uso-cura-${indice}`}
                        rotulo="Tempo Uso"
                        type="number"
                        step="0.5"
                        value={linha.valorUso}
                        onChange={(e) => atualizarLinhaEquipamento(setUsosEnergiaCura, indice, 'valorUso', e.target.value)}
                        placeholder="Ex: 15"
                      />
                    </div>

                    <div className="flex flex-col gap-1 w-28">
                      <label htmlFor={`unidade-uso-cura-${indice}`} className="text-xs font-medium text-on-surface">Unidade</label>
                      <select
                        id={`unidade-uso-cura-${indice}`}
                        value={linha.unidadeUso}
                        onChange={(e) => atualizarLinhaEquipamento(setUsosEnergiaCura, indice, 'unidadeUso', e.target.value as any)}
                        className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="minutos">Minutos</option>
                        <option value="horas">Horas</option>
                        <option value="dias">Dias</option>
                      </select>
                    </div>

                    {usosEnergiaCura.length > 1 && (
                      <Button type="button" variante="ghost" onClick={() => setUsosEnergiaCura((a) => a.filter((_, i) => i !== indice))} className="text-error">×</Button>
                    )}
                  </div>
                ))}
                <Button type="button" variante="ghost" onClick={() => setUsosEnergiaCura((a) => [...a, linhaEquipamentoVazia()])} className="text-xs">
                  + Adicionar equipamento de cura/desbolhamento
                </Button>
              </div>

              <div className="flex justify-between items-center pt-2">
                <Button type="button" variante="ghost" onClick={() => setEtapaFormulario(1)}>
                  ← Voltar
                </Button>
                <div className="flex gap-2">
                  <Button type="submit" disabled={faltamPreRequisitos} variante="primary">
                    Fabricar nova peça
                  </Button>
                  <Button type="button" variante="ghost" onClick={() => setEtapaFormulario(3)}>
                    Próxima Etapa: Desmolde & Acabamento →
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ETAPA 3: DESMOLDE, ACABAMENTO, EPIS, MÃO DE OBRA & ÁGUA */}
          {etapaFormulario === 3 && (
            <div className="flex flex-col gap-4 animate-fadeIn">
              <div className="bg-emerald-950/20 border border-emerald-800/40 p-3.5 rounded-xl">
                <h3 className="text-sm font-semibold text-emerald-300 mb-1 flex items-center gap-1.5">
                  <span>🪚 Etapa 3: Desmolde, Acabamento, Máquinas, EPIs & Mão de Obra</span>
                </h3>
                <p className="text-xs text-slate-300">
                  Após a cura vem o desmolde e o acabamento. Registre horas de mão de obra direta, consumo de água em lixamento, uso de máquinas (lixadeira, politriz, furadeira) e insumos/EPIs de acabamento.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <TextField
                  id="horas-mao-obra"
                  rotulo="Horas de Mão de Obra Ativa Dedicadas (h)"
                  type="number"
                  step="0.25"
                  value={horasMaoDeObra}
                  onChange={(e) => setHorasMaoDeObra(e.target.value)}
                  placeholder={`Ex: 2.5 (Ateliê: R$ ${valorHoraMaoDeObra.toFixed(2)}/hora)`}
                />
                <TextField
                  id="litros-agua"
                  rotulo="Consumo de Água no Lixamento (Litros)"
                  type="number"
                  step="0.5"
                  value={litrosAgua}
                  onChange={(e) => setLitrosAgua(e.target.value)}
                  placeholder="Ex: 5.0 (Se houve lixamento com água)"
                />
              </div>

              <TextField
                id="custo-epi-insumos"
                rotulo="Custo de EPIs e Consumíveis de Acabamento (R$)"
                type="number"
                step="0.50"
                value={custoEpiInsumos}
                onChange={(e) => setCustoEpiInsumos(e.target.value)}
                placeholder="Ex: 8.50 (Luvas, máscara, lixas de lixadeira, ceras)"
              />

              <div className="border-t border-outline-variant/30 pt-3">
                <h4 className="text-sm font-semibold text-on-surface mb-2">Máquinas e Ferramentas Elétricas de Acabamento (Lixadeira, Politriz, Furadeira, Router)</h4>
                {usosEnergiaAcabamento.map((linha, indice) => (
                  <div key={indice} className="flex flex-wrap items-end gap-2 mb-2 p-2.5 rounded-xl border border-outline-variant/40 bg-surface-container/20">
                    <div className="flex-1 min-w-[180px] flex flex-col gap-1">
                      <label htmlFor={`equipamento-acab-${indice}`} className="text-xs font-medium text-on-surface">Máquina / Ferramenta</label>
                      <select
                        id={`equipamento-acab-${indice}`}
                        value={linha.equipamentoId}
                        onChange={(e) => atualizarLinhaEquipamento(setUsosEnergiaAcabamento, indice, 'equipamentoId', e.target.value)}
                        className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="">Selecione a máquina...</option>
                        {equipamentos.map((eq) => (
                          <option key={eq.id} value={String(eq.id)}>
                            {eq.nome} ({eq.potenciaWatts}W)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="w-28">
                      <TextField
                        id={`valor-uso-acab-${indice}`}
                        rotulo="Tempo Uso"
                        type="number"
                        step="0.5"
                        value={linha.valorUso}
                        onChange={(e) => atualizarLinhaEquipamento(setUsosEnergiaAcabamento, indice, 'valorUso', e.target.value)}
                        placeholder="Ex: 30"
                      />
                    </div>

                    <div className="flex flex-col gap-1 w-28">
                      <label htmlFor={`unidade-uso-acab-${indice}`} className="text-xs font-medium text-on-surface">Unidade</label>
                      <select
                        id={`unidade-uso-acab-${indice}`}
                        value={linha.unidadeUso}
                        onChange={(e) => atualizarLinhaEquipamento(setUsosEnergiaAcabamento, indice, 'unidadeUso', e.target.value as any)}
                        className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="minutos">Minutos</option>
                        <option value="horas">Horas</option>
                        <option value="dias">Dias</option>
                      </select>
                    </div>

                    {usosEnergiaAcabamento.length > 1 && (
                      <Button type="button" variante="ghost" onClick={() => setUsosEnergiaAcabamento((a) => a.filter((_, i) => i !== indice))} className="text-error">×</Button>
                    )}
                  </div>
                ))}
                <Button type="button" variante="ghost" onClick={() => setUsosEnergiaAcabamento((a) => [...a, linhaEquipamentoVazia()])} className="text-xs">
                  + Adicionar máquina de acabamento
                </Button>
              </div>

              <div className="flex justify-between items-center pt-2">
                <Button type="button" variante="ghost" onClick={() => setEtapaFormulario(2)}>
                  ← Voltar
                </Button>
                <div className="flex gap-2">
                  <Button type="submit" disabled={faltamPreRequisitos} variante="primary">
                    Fabricar nova peça
                  </Button>
                  <Button type="button" variante="ghost" onClick={() => setEtapaFormulario(4)}>
                    Próxima Etapa: Custos Comerciais & Preço →
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ETAPA 4: CUSTOS COMERCIAIS, PROPAGANDA, FRETE & PRECIFICAÇÃO FINAL */}
          {etapaFormulario === 4 && (
            <div className="flex flex-col gap-4 animate-fadeIn">
              <div className="bg-blue-950/20 border border-blue-800/40 p-3.5 rounded-xl">
                <h3 className="text-sm font-semibold text-blue-300 mb-1 flex items-center gap-1.5">
                  <span>💰 Etapa 4: Propaganda, Frete & Precificação Final</span>
                </h3>
                <p className="text-xs text-slate-300">
                  Defina os custos de divulgação/propaganda e frete da peça. As taxas da loja e a margem de lucro são aplicadas automaticamente conforme configurado na Precificação.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <TextField
                  id="valor-propaganda-total"
                  rotulo="Investimento em Propaganda / Anúncios (R$)"
                  type="number"
                  step="1"
                  value={valorPropagandaTotal}
                  onChange={(e) => setValorPropagandaTotal(e.target.value)}
                  placeholder="Ex: 30.00 (Total pago na campanha)"
                />
                <TextField
                  id="dias-propaganda"
                  rotulo="Duração da Campanha de Propaganda (Dias)"
                  type="number"
                  step="1"
                  value={diasPropaganda}
                  onChange={(e) => setDiasPropaganda(e.target.value)}
                  placeholder="Ex: 30 (Rateio: R$ 1.00/dia por peça)"
                />
              </div>

              {custoPropagandaDia > 0 && (
                <p className="text-xs text-blue-400 font-mono font-medium">
                  📢 Rateio de Propaganda calculado: R$ {custoPropagandaDia.toFixed(2)} por peça (ou por dia de divulgação)
                </p>
              )}

              <TextField
                id="valor-frete"
                rotulo="Frete (R$)"
                type="number"
                step="0.50"
                value={valorFrete}
                onChange={(e) => setValorFrete(e.target.value)}
                placeholder="Ex: 15.00 (Valor integral do frete)"
              />

              <SeletorImagem
                imagemUrl={imagemUrl}
                onImagemSelecionada={setImagemUrl}
                label="Foto do Produto (Câmera do Ateliê ou Galeria)"
              />

              <div className="rounded-xl border border-primary/50 bg-slate-900/90 p-4 flex flex-col gap-3 shadow-lg mt-2">
                <div className="flex items-center justify-between border-b border-outline-variant/40 pb-2">
                  <span className="text-sm font-semibold text-on-surface">📊 Resumo de Custos e Precificação Realista</span>
                  <Badge variant="success" className="text-[11px] font-mono">
                    Preço Sugerido: R$ {precificacaoRes.precoFinal.toFixed(2)}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-on-surface-variant block">Materiais & Insumos:</span>
                    <strong className="text-on-surface font-mono">R$ {precificacaoRes.custoMaterial.toFixed(2)}</strong>
                  </div>
                  <div>
                    <span className="text-on-surface-variant block flex items-center gap-1">
                      Amortização do Molde:
                    </span>
                    <strong className="text-amber-400 font-mono">+R$ {precificacaoRes.custoForma.toFixed(2)}</strong>
                    <span className="text-[10px] text-slate-400 block">(Valor acrescentado)</span>
                  </div>
                  <div>
                    <span className="text-on-surface-variant block">Energia & Máquinas:</span>
                    <strong className="text-on-surface font-mono">R$ {precificacaoRes.custoEnergia.toFixed(2)}</strong>
                  </div>
                  <div>
                    <span className="text-on-surface-variant block">Mão de Obra ({horasMaoDeObra || 0}h):</span>
                    <strong className="text-on-surface font-mono">R$ {precificacaoRes.custoMaoDeObra.toFixed(2)}</strong>
                  </div>
                  <div>
                    <span className="text-on-surface-variant block">Propaganda & Frete:</span>
                    <strong className="text-on-surface font-mono">R$ {(custoPropagandaDia + (Number(valorFrete) || 0)).toFixed(2)}</strong>
                  </div>
                  <div>
                    <span className="text-on-surface-variant block">Custo Direto Total:</span>
                    <strong className="text-on-surface font-mono">R$ {precificacaoRes.custoDireto.toFixed(2)}</strong>
                  </div>
                  <div>
                    <span className="text-on-surface-variant block">Lucro Previsto:</span>
                    <strong className="text-emerald-400 font-mono">R$ {precificacaoRes.lucro.toFixed(2)}</strong>
                  </div>
                  <div>
                    <span className="text-on-surface-variant block">Custo Total:</span>
                    <strong className="text-on-surface font-mono">R$ {precificacaoRes.custoTotal.toFixed(2)}</strong>
                  </div>
                </div>
              </div>

              {erro && <p role="alert" className="text-sm text-error">{erro}</p>}

              <div className="flex justify-between items-center pt-2">
                <Button type="button" variante="ghost" onClick={() => setEtapaFormulario(3)}>
                  ← Voltar
                </Button>
                <Button type="submit" disabled={faltamPreRequisitos} variante="primary" className="py-2.5 font-bold">
                  Fabricar nova peça
                </Button>
              </div>
            </div>
          )}
        </form>
      </Card>

      <section>
        <h2 className="mb-4 text-sm font-semibold text-on-surface">Todas as Peças</h2>
        {pecas.length === 0 ? (
          <EmptyState titulo="Nenhuma peça cadastrada" descricao="Cadastre a primeira peça em produção." />
        ) : (
          <div className="relative pl-6 sm:pl-32 flex flex-col gap-5 before:absolute before:left-2.5 sm:before:left-[108px] before:top-3 before:bottom-3 before:w-[2px] before:bg-outline-variant/40 before:border-r before:border-dashed before:border-outline-variant/60">
            {pecas.map((peca) => {
              const statusStr = peca.status || 'pronta'
              const statusFormatado = statusStr.toUpperCase().replace('_', ' ')
              const statusVariant =
                statusStr === 'vendida'
                  ? 'success'
                  : statusStr === 'cancelada'
                  ? 'danger'
                  : statusStr === 'curando'
                  ? 'warning'
                  : 'neutral'

              return (
                <div key={peca.id} className="relative flex flex-col sm:flex-row items-start gap-4">
                  <div className="hidden sm:flex flex-col items-end w-24 shrink-0 pt-1 text-right">
                    <span className="text-xs font-semibold text-on-surface uppercase tracking-wider">
                      PEÇA
                    </span>
                    <span className="text-[11px] text-on-surface-variant font-mono">
                      #{peca.id}
                    </span>
                  </div>

                  <div className="absolute -left-6 sm:static sm:left-auto pt-1 shrink-0 z-10">
                    <div className="h-5 w-5 rounded-full border-2 border-primary bg-primary/20 text-primary flex items-center justify-center shadow-sm">
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    </div>
                  </div>

                  <Card className="flex-1 w-full glow-hover flex flex-col gap-2">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-outline-variant/30 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="sm:hidden text-xs font-semibold uppercase text-on-surface">
                          PEÇA #{peca.id}
                        </span>
                        <Badge variant={statusVariant} className="uppercase font-bold tracking-wider text-[10px] px-2.5 py-0.5">
                          {statusFormatado}
                        </Badge>
                      </div>
                      {peca.precoVenda !== undefined && peca.precoVenda > 0 && (
                        <span className="text-xs font-mono font-semibold text-primary">
                          Preço: R$ {peca.precoVenda.toFixed(2)}
                        </span>
                      )}
                    </div>

                    {(() => {
                      const temCuraAtiva = peca.curaMinutos && peca.curaIniciadaEm
                      if (!temCuraAtiva && peca.status !== 'curando') return null
                      const restanteCura = temCuraAtiva ? calcularRestanteCura(peca, agora) : 0
                      const progressoCura = temCuraAtiva ? calcularProgressoCura(peca, agora) * 100 : 0
                      const curaConcluida = temCuraAtiva && restanteCura <= 0

                      return (
                        <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-2.5 flex flex-col gap-1.5 my-1">
                          <div className="flex items-center justify-between text-xs font-semibold">
                            <span className="text-amber-300 flex items-center gap-1">
                              {curaConcluida ? '✅ Cura Concluída!' : '⏳ Tempo de Cura em Andamento'}
                            </span>
                            <span className="font-mono text-amber-400">
                              {curaConcluida ? 'Concluída' : `Faltam ${formatarTempoRestanteCura(restanteCura)}`}
                            </span>
                          </div>
                          {temCuraAtiva && (
                            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden border border-amber-500/20">
                              <div
                                className={`h-full transition-all duration-500 ${curaConcluida ? 'bg-emerald-500' : 'bg-amber-500'}`}
                                style={{ width: `${progressoCura}%` }}
                              />
                            </div>
                          )}
                          <div className="flex items-center justify-between text-[11px] text-slate-400">
                            <span>{progressoCura.toFixed(0)}% concluído</span>
                            <button
                              type="button"
                              onClick={() => {
                                setPecaAdicionarCuraId(peca.id!)
                                setAddCuraValor('')
                                setAddCuraUnidade('horas')
                              }}
                              className="text-amber-400 hover:text-amber-300 font-semibold underline flex items-center gap-1"
                            >
                              ➕ Adicionar Tempo de Cura
                            </button>
                          </div>
                        </div>
                      )
                    })()}

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {peca.imagemUrl ? (
                          <img
                            src={peca.imagemUrl}
                            alt={peca.nome}
                            className="w-12 h-12 object-cover rounded-xl border border-outline-variant/40 shadow-sm shrink-0"
                          />
                        ) : (
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary text-base font-semibold">
                            🧩
                          </div>
                        )}
                        <div className="flex flex-col min-w-0">
                          <Link to="/pecas/$pecaId" params={{ pecaId: String(peca.id) }} className="hover:underline font-semibold text-on-surface text-base truncate">
                            {peca.nome}
                          </Link>
                          {peca.nomeForma && (
                            <p className="text-xs text-on-surface-variant flex items-center gap-1.5 mt-0.5">
                              <span className="text-[10px] font-medium bg-surface-container-high/40 px-2 py-0.5 rounded border border-outline-variant/40">
                                Molde: {peca.nomeForma}
                              </span>
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Link to="/pecas/$pecaId" params={{ pecaId: String(peca.id) }}>
                          <Button variante="ghost" className="text-xs">
                            Detalhes & Etapas →
                          </Button>
                        </Link>
                        <Button variante="ghost" className="text-xs text-error hover:bg-error/10" onClick={() => setPecaExcluindoId(peca.id ?? null)}>
                          Excluir
                        </Button>
                      </div>
                    </div>
                  </Card>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <ConfirmModal
        aberto={pecaExcluindoId !== null}
        titulo="Excluir peça?"
        descricao="O material consumido volta ao estoque."
        onConfirmar={() => pecaExcluindoId !== null && handleExcluir(pecaExcluindoId)}
        onCancelar={() => setPecaExcluindoId(null)}
      />

      <ConfirmModal
        aberto={pecaAdicionarCuraId !== null}
        titulo="➕ Adicionar Tempo de Cura"
        descricao="Adicione mais dias, horas ou minutos ao cronômetro de cura desta peça."
        onConfirmar={handleConfirmarAdicionarCura}
        onCancelar={() => setPecaAdicionarCuraId(null)}
      >
        <div className="flex gap-2 items-end pt-2 text-left">
          <div className="flex-1">
            <TextField
              id="add-cura-val"
              rotulo="Tempo a Adicionar"
              type="number"
              step="0.5"
              value={addCuraValor}
              onChange={(e) => setAddCuraValor(e.target.value)}
              placeholder="Ex: 1 (dia), 12 (horas)"
            />
          </div>
          <div className="flex flex-col gap-1 w-32">
            <label htmlFor="add-cura-unidade" className="text-xs font-medium text-on-surface">Unidade</label>
            <select
              id="add-cura-unidade"
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
        </>
      )}
    </div>
  )
}
