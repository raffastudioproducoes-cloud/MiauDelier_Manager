import { useEffect, useRef, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { TextField } from '../../components/ui/TextField'
import { EmptyState } from '../../components/ui/EmptyState'
import { ConfirmModal } from '../../components/ui/ConfirmModal'
import { Badge } from '../../components/ui/Badge'
import { useToast } from '../../components/ui/useToast'
import {
  criarTaxa,
  atualizarTaxa,
  listarTaxas,
  excluirTaxa,
} from './taxasRepo'
import type { Taxa } from '../../db/schema'

export interface PresetTaxa {
  id: string
  nome: string
  categoria: 'marketplace' | 'gateway'
  percentual: number | null
  valorFixo: number | null
  descricao: string
  precoMinimo?: number
  precoMaximoExclusivo?: number
}

const PRESETS_TAXAS: PresetTaxa[] = [
  { id: 'shopee-ate-9', precoMinimo: 0, precoMaximoExclusivo: 9, nome: 'Shopee — item abaixo de R$ 9 (20% + 50% do preço)', categoria: 'marketplace', percentual: 70, valorFixo: 0, descricao: 'Referência CNPJ: 20% de comissão mais tarifa de 50% do preço, representados juntos como 70%. Confirme as condições da conta.' },
  { id: 'shopee-9-80', precoMinimo: 9, precoMaximoExclusivo: 80, nome: 'Shopee — item de R$ 9 a R$ 79,99 (20% + R$ 4,50)', categoria: 'marketplace', percentual: 20, valorFixo: 4.5, descricao: 'Referência por faixa para vendedor CNPJ: confirme a faixa do preço final e as condições da sua conta. Abaixo de R$ 9 a taxa fixa é variável; vendedores CPF podem ter adicional.' },
  { id: 'shopee-80-100', precoMinimo: 80, precoMaximoExclusivo: 100, nome: 'Shopee — item de R$ 80 a R$ 99,99 (14% + R$ 16)', categoria: 'marketplace', percentual: 14, valorFixo: 16, descricao: 'Referência por faixa para vendedor CNPJ; confirme a faixa do preço final e as condições da conta.' },
  { id: 'shopee-100-200', precoMinimo: 100, precoMaximoExclusivo: 200, nome: 'Shopee — item de R$ 100 a R$ 199,99 (14% + R$ 20)', categoria: 'marketplace', percentual: 14, valorFixo: 20, descricao: 'Referência por faixa para vendedor CNPJ; confirme a faixa do preço final e as condições da conta.' },
  { id: 'shopee-200', precoMinimo: 200, nome: 'Shopee — item a partir de R$ 200 (14% + R$ 26)', categoria: 'marketplace', percentual: 14, valorFixo: 26, descricao: 'Referência por faixa para vendedor CNPJ; confirme as condições da conta e eventuais custos adicionais.' },
  { id: 'ml-classico', nome: 'Mercado Livre — Clássico (consultar categoria e logística)', categoria: 'marketplace', percentual: null, valorFixo: null, descricao: 'As taxas variam por categoria, anúncio, preço e logística. Consulte o simulador da plataforma e informe os valores.' },
  { id: 'ml-premium', nome: 'Mercado Livre — Premium (consultar categoria e logística)', categoria: 'marketplace', percentual: null, valorFixo: null, descricao: 'As taxas variam por categoria, anúncio, preço e logística. Consulte o simulador da plataforma e informe os valores.' },
  { id: 'elo7-padrao', nome: 'Elo7 — operações encerradas (histórico)', categoria: 'marketplace', percentual: null, valorFixo: null, descricao: 'O Elo7 deixou de receber novos pedidos em 11/05/2026. Consulte os registros históricos quando necessário.' },
  { id: 'amazon-pet', nome: 'Amazon Brasil — Pets, plano Individual (12% + R$ 2)', categoria: 'marketplace', percentual: 12, valorFixo: 2, descricao: 'Referência para produtos para animais no plano Individual; há comissão mínima e custos de logística que podem variar.' },
  { id: 'amazon-geral', nome: 'Amazon Brasil — outra categoria ou plano (consultar)', categoria: 'marketplace', percentual: null, valorFixo: null, descricao: 'Comissão varia pela categoria; a cobrança de R$ 2 por item é do plano Individual. Confirme também a comissão mínima e logística.' },
  { id: 'shein-local', nome: 'SHEIN Brasil — consultar comissão da conta', categoria: 'marketplace', percentual: null, valorFixo: null, descricao: 'As fontes consultadas apresentam valores divergentes. Confirme a comissão da categoria e conta antes de preencher.' },
  { id: 'kiwify-vendas', nome: 'Kiwify — venda aprovada (8,99% + R$ 2,49)', categoria: 'gateway', percentual: 8.99, valorFixo: 2.49, descricao: 'Taxa padrão por venda aprovada; condições negociadas e saque podem variar.' },
  { id: 'hotmart-micro', precoMinimo: 0, precoMaximoExclusivo: 10.01, nome: 'Hotmart — venda em BRL até R$ 10 (20%)', categoria: 'gateway', percentual: 20, valorFixo: 0, descricao: 'Referência para microtransação em reais de até R$ 10. Outras condições podem se aplicar.' },
  { id: 'hotmart-vendas', precoMinimo: 10.01, nome: 'Hotmart — venda em BRL acima de R$ 10 (9,9% + R$ 2,49)', categoria: 'gateway', percentual: 9.9, valorFixo: 2.49, descricao: 'Referência para venda em reais acima de R$ 10. Outras faixas, produtos e serviços têm condições próprias.' },
]

export function TaxasPage() {
  const { mostrarToast } = useToast()
  const [taxas, setTaxas] = useState<Taxa[]>([])
  const [nome, setNome] = useState('')
  const [percentual, setPercentual] = useState('')
  const [valorFixo, setValorFixo] = useState('')
  const [presetIdSelecionado, setPresetIdSelecionado] = useState('')
  const [presetReconhecido, setPresetReconhecido] = useState<PresetTaxa | null>(null)
  const [taxaExcluindoId, setTaxaExcluindoId] = useState<number | null>(null)
  const [taxaEditandoId, setTaxaEditandoId] = useState<number | null>(null)
  const montado = useRef(true)

  async function recarregar() {
    const lista = await listarTaxas()
    if (!montado.current) return
    setTaxas(lista)
  }

  useEffect(() => {
    montado.current = true
    recarregar().catch((err) => {
      if (montado.current) {
        mostrarToast(err instanceof Error ? err.message : 'Erro ao carregar taxas de vendedor.', 'erro')
      }
    })
    return () => {
      montado.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function aplicarPreset(preset: PresetTaxa) {
    setPresetIdSelecionado(preset.id)
    setNome(preset.nome)
    setPercentual(preset.percentual === null ? '' : String(preset.percentual))
    setValorFixo(preset.valorFixo === null ? '' : String(preset.valorFixo))
    setPresetReconhecido(preset)
  }

  function handleMudarNome(val: string) {
    setNome(val)
    if (presetIdSelecionado) return

    // Busca automática por palavra-chave se o usuário digitar o nome da plataforma
    const valLower = val.toLowerCase().trim()
    if (valLower.length >= 3) {
      const encontrado = PRESETS_TAXAS.find((p) => {
        const pNomeLower = p.nome.toLowerCase()
        if (valLower.includes('shopee')) return false
        if (valLower.includes('mercado') && p.id === 'ml-classico') return true
        if (valLower.includes('elo7') && p.id === 'elo7-padrao') return true
        if (valLower.includes('amazon') && p.id === 'amazon-geral') return true
        if (valLower.includes('shein') && p.id === 'shein-local') return true
        if (valLower.includes('kiwify') && p.id === 'kiwify-vendas') return true
        if (valLower.includes('hotmart') && p.id === 'hotmart-vendas') return true
        return pNomeLower.includes(valLower)
      })

      if (encontrado) {
        setPresetReconhecido(encontrado)
        if (percentual === '' && valorFixo === '') {
          setPercentual(encontrado.percentual === null ? '' : String(encontrado.percentual))
          setValorFixo(encontrado.valorFixo === null ? '' : String(encontrado.valorFixo))
        }
      } else {
        setPresetReconhecido(null)
      }
    } else {
      setPresetReconhecido(null)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nome.trim()) {
      mostrarToast('Informe o nome da plataforma ou canal de venda', 'erro')
      return
    }
    const perc = Number(percentual)
    const fixo = Number(valorFixo || 0)
    if (percentual.trim() === '' || !Number.isFinite(perc) || perc < 0 || perc >= 100) {
      mostrarToast('Percentual inválido (deve ser entre 0% e 99.9%)', 'erro')
      return
    }
    if ((presetReconhecido?.valorFixo === null && valorFixo.trim() === '') || !Number.isFinite(fixo) || fixo < 0) {
      mostrarToast('Informe uma taxa fixa válida e não negativa.', 'erro')
      return
    }

    try {
      const taxaAnterior = taxas.find(t => t.id === taxaEditandoId)
      const dados = {
        nome: nome.trim(),
        percentual: perc,
        valorFixo: fixo,
        precoMinimo: presetReconhecido ? presetReconhecido.precoMinimo : taxaAnterior?.precoMinimo,
        precoMaximoExclusivo: presetReconhecido ? presetReconhecido.precoMaximoExclusivo : taxaAnterior?.precoMaximoExclusivo,
      }
      if (taxaEditandoId !== null) await atualizarTaxa(taxaEditandoId, dados)
      else await criarTaxa(dados)

      mostrarToast('Taxa de vendedor cadastrada com sucesso!')
      setNome('')
      setPercentual('')
      setValorFixo('')
      setPresetIdSelecionado('')
      setPresetReconhecido(null)
      setTaxaEditandoId(null)
      await recarregar()
    } catch (err) {
      mostrarToast(err instanceof Error ? err.message : 'Erro ao cadastrar taxa de vendedor.', 'erro')
    }
  }

  async function handleExcluir(id: number) {
    try {
      await excluirTaxa(id)
      mostrarToast('Taxa de vendedor excluída!')
      setTaxaExcluindoId(null)
      await recarregar()
    } catch (err) {
      mostrarToast(err instanceof Error ? err.message : 'Erro ao excluir taxa de vendedor.', 'erro')
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-on-surface">Taxas de Vendedor (Marketplaces & Plataformas)</h1>
        <p className="text-label-sm text-on-surface-variant">
          Tarifas e comissões que as plataformas de vendas (Shopee, Mercado Livre, Elo7, Amazon, etc.) cobram do vendedor para manter produtos na plataforma e concretizar vendas.
        </p>
      </div>

      <Card>
        <h2 className="mb-3 font-medium text-on-surface">Nova Taxa de Vendedor</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Seletor Automático de Plataformas / Presets */}
          <div className="flex flex-col gap-1.5 rounded-xl border border-primary/30 bg-primary/5 p-3.5">
            <label htmlFor="select-preset-plataforma" className="text-xs font-bold uppercase text-primary flex items-center gap-1.5">
              ⚡ Preenchimento Automático por Plataforma (Taxa de Vendedor)
            </label>
            <p className="text-xs text-on-surface-variant">
              Selecione uma referência e confirme as tarifas da sua conta. Elas podem variar por preço, categoria, plano e logística. Os valores cadastrados anteriormente não são alterados automaticamente.
            </p>

            <select
              id="select-preset-plataforma"
              value={presetIdSelecionado}
              onChange={(e) => {
                const found = PRESETS_TAXAS.find((p) => p.id === e.target.value)
                if (found) aplicarPreset(found)
              }}
              className="mt-1 rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            >
              <option value="">+ Escolher plataforma de venda (Shopee, Mercado Livre, Elo7, Amazon, Shein, Kiwify...)</option>
              {PRESETS_TAXAS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>

            {presetReconhecido && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-2 pt-2 border-t border-primary/20 text-xs text-on-surface">
                <span>
                  💡 <strong>{presetReconhecido.nome}:</strong> {presetReconhecido.descricao}
                </span>
                <Badge variant="success" className="whitespace-nowrap">{presetReconhecido.percentual === null ? 'Informe as taxas da conta' : 'Referência para conferir'}</Badge>
              </div>
            )}
          </div>

          <TextField
            id="nome-taxa"
            rotulo="Nome da Plataforma ou Canal de Venda"
            placeholder="Ex: Shopee (Taxa de Vendedor) / Mercado Livre / Elo7"
            value={nome}
            onChange={(e) => handleMudarNome(e.target.value)}
          />

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="w-full sm:w-1/2">
              <TextField
                id="percentual-taxa"
                rotulo="Comissão Percentual do Vendedor (%)"
                type="number"
                step="0.01"
                placeholder="Ex: 14"
                value={percentual}
                onChange={(e) => setPercentual(e.target.value)}
              />
            </div>
            <div className="w-full sm:w-1/2">
              <TextField
                id="fixo-taxa"
                rotulo="Taxa Fixa da Plataforma por Venda (R$)"
                type="number"
                step="0.01"
                placeholder="Ex: 4.00"
                value={valorFixo}
                onChange={(e) => setValorFixo(e.target.value)}
              />
            </div>
          </div>

          <Button type="submit">{taxaEditandoId !== null ? 'Salvar Taxa de Vendedor' : 'Cadastrar Taxa de Vendedor'}</Button>
          {taxaEditandoId !== null && <Button type="button" variante="ghost" onClick={() => { setTaxaEditandoId(null); setNome(''); setPercentual(''); setValorFixo(''); setPresetIdSelecionado(''); setPresetReconhecido(null) }}>Cancelar edição</Button>}
        </form>
      </Card>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-on-surface">Taxas de Vendedor Cadastradas</h2>
        {taxas.length === 0 ? (
          <EmptyState
            titulo="Nenhuma taxa de vendedor cadastrada"
            descricao="Cadastre as taxas que as plataformas de vendas (Shopee, Mercado Livre, etc.) cobram para manter seus produtos e intermediar as vendas. Elas são usadas para calcular seu preço ideal de venda."
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {taxas.map((tx) => (
              <Card key={tx.id} className="glow-hover">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-medium text-on-surface">{tx.nome}</h3>
                    <p className="text-label-sm text-on-surface-variant mt-1">
                      Taxa do Vendedor: <strong>{tx.percentual.toFixed(2)}%</strong>
                      {tx.valorFixo > 0 ? ` + R$ ${tx.valorFixo.toFixed(2)} fixo da plataforma` : ''}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variante="ghost" onClick={() => { setTaxaEditandoId(tx.id ?? null); setNome(tx.nome); setPercentual(String(tx.percentual)); setValorFixo(String(tx.valorFixo)); setPresetIdSelecionado(''); setPresetReconhecido(null); document.getElementById('nome-taxa')?.focus() }}>Editar</Button>
                    <Button variante="ghost" onClick={() => setTaxaExcluindoId(tx.id ?? null)}>Excluir</Button>
                  </div>
                </div>
              </Card>
            ))}
          </ul>
        )}
      </section>

      <ConfirmModal
        aberto={taxaExcluindoId !== null}
        titulo="Excluir taxa de vendedor?"
        descricao="Esta ação não afetará precificações anteriores já gravadas."
        onConfirmar={() => taxaExcluindoId !== null && handleExcluir(taxaExcluindoId)}
        onCancelar={() => setTaxaExcluindoId(null)}
      />
    </div>
  )
}
