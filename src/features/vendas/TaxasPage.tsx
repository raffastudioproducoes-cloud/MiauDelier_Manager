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
  listarTaxas,
  excluirTaxa,
} from './taxasRepo'
import type { Taxa } from '../../db/schema'

export interface PresetTaxa {
  id: string
  nome: string
  categoria: 'marketplace' | 'gateway'
  percentual: number
  valorFixo: number
  descricao: string
}

const PRESETS_TAXAS: PresetTaxa[] = [
  // Shopee
  {
    id: 'shopee-padrao',
    nome: 'Shopee - Taxa de Vendedor Padrão (14% + R$ 4,00)',
    categoria: 'marketplace',
    percentual: 14,
    valorFixo: 4.0,
    descricao: 'Tarifa do vendedor: 14% de comissão + R$ 4,00 de taxa fixa operacional por item vendido.',
  },
  {
    id: 'shopee-frete-gratis',
    nome: 'Shopee - Taxa de Vendedor com Frete Grátis Extra (20% + R$ 4,00)',
    categoria: 'marketplace',
    percentual: 20,
    valorFixo: 4.0,
    descricao: 'Tarifa do vendedor: 20% (14% comissão padrão + 6% programa) + R$ 4,00 fixo por item vendido.',
  },

  // Mercado Livre
  {
    id: 'ml-classico',
    nome: 'Mercado Livre - Taxa de Vendedor Clássico (11.5% + R$ 6,00)',
    categoria: 'marketplace',
    percentual: 11.5,
    valorFixo: 6.0,
    descricao: 'Tarifa do vendedor: 11.5% de comissão sobre a venda + R$ 6,00 de tarifa fixa por unidade.',
  },
  {
    id: 'ml-premium',
    nome: 'Mercado Livre - Taxa de Vendedor Premium (16.5% + R$ 6,00)',
    categoria: 'marketplace',
    percentual: 16.5,
    valorFixo: 6.0,
    descricao: 'Tarifa do vendedor: 16.5% de comissão com parcelamento sem juros + R$ 6,00 fixo por unidade.',
  },

  // Elo7
  {
    id: 'elo7-padrao',
    nome: 'Elo7 - Taxa de Vendedor Padrão (12%)',
    categoria: 'marketplace',
    percentual: 12,
    valorFixo: 0,
    descricao: 'Tarifa do vendedor: 12% de comissão cobrada pela plataforma sobre o valor da venda.',
  },
  {
    id: 'elo7-plus',
    nome: 'Elo7 - Taxa de Vendedor Exposição Plus (18%)',
    categoria: 'marketplace',
    percentual: 18,
    valorFixo: 0,
    descricao: 'Tarifa do vendedor: 18% de comissão cobrada para manter e expor produtos no marketplace.',
  },

  // Amazon
  {
    id: 'amazon-artesanato',
    nome: 'Amazon Brasil - Taxa de Vendedor Artesanato / Handmade (15% + R$ 2,00)',
    categoria: 'marketplace',
    percentual: 15,
    valorFixo: 2.0,
    descricao: 'Tarifa do vendedor: 15% de comissão de venda da categoria + R$ 2,00 de taxa fixa de fechamento.',
  },
  {
    id: 'amazon-geral',
    nome: 'Amazon Brasil - Taxa de Vendedor Produtos Gerais (14% + R$ 2,00)',
    categoria: 'marketplace',
    percentual: 14,
    valorFixo: 2.0,
    descricao: 'Tarifa do vendedor: 14% de comissão média cobrada pela plataforma + R$ 2,00 por item vendido.',
  },

  // Shein
  {
    id: 'shein-local',
    nome: 'Shein Brasil - Taxa de Vendedor Local (16%)',
    categoria: 'marketplace',
    percentual: 16,
    valorFixo: 0,
    descricao: 'Tarifa do vendedor: 16% de comissão cobrada pela Shein para lojistas e fabricantes locais.',
  },

  // Gateways e Infoprodutos
  {
    id: 'kiwify-vendas',
    nome: 'Kiwify - Taxa de Vendedor (8.99% + R$ 2,49)',
    categoria: 'gateway',
    percentual: 8.99,
    valorFixo: 2.49,
    descricao: 'Tarifa cobrada pela plataforma por transação de venda aprovada.',
  },
  {
    id: 'hotmart-vendas',
    nome: 'Hotmart - Taxa de Vendedor (9.9% + R$ 1,00)',
    categoria: 'gateway',
    percentual: 9.9,
    valorFixo: 1.0,
    descricao: 'Tarifa cobrada pela plataforma por intermediação de venda realizada.',
  },
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
    setPercentual(String(preset.percentual))
    setValorFixo(preset.valorFixo > 0 ? String(preset.valorFixo) : '0')
    setPresetReconhecido(preset)
  }

  function handleMudarNome(val: string) {
    setNome(val)
    setPresetIdSelecionado('')

    // Busca automática por palavra-chave se o usuário digitar o nome da plataforma
    const valLower = val.toLowerCase().trim()
    if (valLower.length >= 3) {
      const encontrado = PRESETS_TAXAS.find((p) => {
        const pNomeLower = p.nome.toLowerCase()
        if (valLower.includes('shopee') && p.id === 'shopee-frete-gratis') return true
        if (valLower.includes('mercado') && p.id === 'ml-classico') return true
        if (valLower.includes('elo7') && p.id === 'elo7-padrao') return true
        if (valLower.includes('amazon') && p.id === 'amazon-artesanato') return true
        if (valLower.includes('shein') && p.id === 'shein-local') return true
        if (valLower.includes('kiwify') && p.id === 'kiwify-vendas') return true
        if (valLower.includes('hotmart') && p.id === 'hotmart-vendas') return true
        return pNomeLower.includes(valLower)
      })

      if (encontrado) {
        setPresetReconhecido(encontrado)
        if (percentual === '' && valorFixo === '') {
          setPercentual(String(encontrado.percentual))
          setValorFixo(encontrado.valorFixo > 0 ? String(encontrado.valorFixo) : '0')
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
    if (isNaN(perc) || perc < 0 || perc >= 100) {
      mostrarToast('Percentual inválido (deve ser entre 0% e 99.9%)', 'erro')
      return
    }

    try {
      await criarTaxa({
        nome: nome.trim(),
        percentual: perc,
        valorFixo: fixo,
      })

      mostrarToast('Taxa de vendedor cadastrada com sucesso!')
      setNome('')
      setPercentual('')
      setValorFixo('')
      setPresetIdSelecionado('')
      setPresetReconhecido(null)
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
              Selecione a plataforma de venda ou digite o nome para carregar as tarifas oficiais cobradas do vendedor (comissão percentual da plataforma e taxa fixa por unidade). Você pode ajustar os valores livremente.
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
                <Badge variant="success" className="whitespace-nowrap">Taxa de Vendedor Carregada</Badge>
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

          <Button type="submit">Cadastrar Taxa de Vendedor</Button>
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
                  <Button variante="ghost" onClick={() => setTaxaExcluindoId(tx.id ?? null)}>
                    Excluir
                  </Button>
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
