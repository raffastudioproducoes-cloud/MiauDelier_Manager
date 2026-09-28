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
  categoria: 'marketplace' | 'maquininha' | 'gateway'
  percentual: number
  valorFixo: number
  descricao: string
}

export const PRESETS_TAXAS: PresetTaxa[] = [
  // Shopee
  { id: 'shopee-padrao', nome: 'Shopee - Comissão Padrão (14% + R$ 4,00)', categoria: 'marketplace', percentual: 14, valorFixo: 4.0, descricao: '14% de comissão + R$ 4,00 taxa fixa por item vendido (sem programa de frete grátis extra).' },
  { id: 'shopee-frete-gratis', nome: 'Shopee - Programa Frete Grátis Extra (20% + R$ 4,00)', categoria: 'marketplace', percentual: 20, valorFixo: 4.0, descricao: '20% de comissão + R$ 4,00 taxa fixa por item (14% comissão + 6% frete grátis extra).' },

  // Mercado Livre
  { id: 'ml-classico', nome: 'Mercado Livre - Anúncio Clássico (11.5% + R$ 6,00)', categoria: 'marketplace', percentual: 11.5, valorFixo: 6.0, descricao: '11.5% de comissão + R$ 6,00 tarifa fixa por unidade (para vendas abaixo de R$ 79,00).' },
  { id: 'ml-premium', nome: 'Mercado Livre - Anúncio Premium (16.5% + R$ 6,00)', categoria: 'marketplace', percentual: 16.5, valorFixo: 6.0, descricao: '16.5% de comissão + R$ 6,00 tarifa fixa por unidade com parcelamento sem juros.' },

  // Elo7
  { id: 'elo7-padrao', nome: 'Elo7 - Anúncio Padrão (12%)', categoria: 'marketplace', percentual: 12, valorFixo: 0, descricao: '12% de comissão sobre o valor total do pedido.' },
  { id: 'elo7-plus', nome: 'Elo7 - Anúncio Plus / Destaque (18%)', categoria: 'marketplace', percentual: 18, valorFixo: 0, descricao: '18% de comissão sobre o valor total com destaque nas pesquisas.' },

  // Amazon
  { id: 'amazon-artesanato', nome: 'Amazon Brasil - Artesanato / Handmade (15% + R$ 2,00)', categoria: 'marketplace', percentual: 15, valorFixo: 2.0, descricao: '15% de comissão de venda + R$ 2,00 de tarifa de fechamento.' },
  { id: 'amazon-geral', nome: 'Amazon Brasil - Produtos Gerais (14% + R$ 2,00)', categoria: 'marketplace', percentual: 14, valorFixo: 2.0, descricao: '14% de comissão média + R$ 2,00 por item vendido.' },

  // Shein
  { id: 'shein-local', nome: 'Shein Brasil - Vendedor Local (16%)', categoria: 'marketplace', percentual: 16, valorFixo: 0, descricao: '16% de comissão para lojistas e artesãos brasileiros.' },

  // Gateways e Infoprodutos
  { id: 'kiwify-vendas', nome: 'Kiwify - Vendas Online (8.99% + R$ 2,49)', categoria: 'gateway', percentual: 8.99, valorFixo: 2.49, descricao: '8.99% + R$ 2,49 de taxa por transação aprovada.' },
  { id: 'hotmart-vendas', nome: 'Hotmart - Produtos Digitais (9.9% + R$ 1,00)', categoria: 'gateway', percentual: 9.9, valorFixo: 1.0, descricao: '9.9% + R$ 1,00 de taxa por venda realizada.' },

  // Maquininhas & Meios Digitais
  { id: 'pix-dinheiro', nome: 'Pix / Dinheiro / Transferência Direta (0%)', categoria: 'maquininha', percentual: 0, valorFixo: 0, descricao: '0% de taxa. Recebimento imediato sem custos de intermediação.' },
  { id: 'cartao-debito', nome: 'Cartão de Débito (1.99%)', categoria: 'maquininha', percentual: 1.99, valorFixo: 0, descricao: '1.99% de taxa média para recebimento em 1 dia útil.' },
  { id: 'cartao-credito-vista', nome: 'Cartão de Crédito À Vista (3.49%)', categoria: 'maquininha', percentual: 3.49, valorFixo: 0, descricao: '3.49% de taxa média para crédito à vista.' },
  { id: 'cartao-credito-12x', nome: 'Cartão de Crédito Parcelado em 12x (12.5%)', categoria: 'maquininha', percentual: 12.5, valorFixo: 0, descricao: '12.5% de taxa total para antecipação de 12 parcelas.' },
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
        mostrarToast(err instanceof Error ? err.message : 'Erro ao carregar taxas.', 'erro')
      }
    })
    return () => {
      montado.current = false
    }
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
        if (valLower.includes('pix') && p.id === 'pix-dinheiro') return true
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
      mostrarToast('Informe o nome da taxa ou canal', 'erro')
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

      mostrarToast('Taxa de marketplace cadastrada!')
      setNome('')
      setPercentual('')
      setValorFixo('')
      setPresetIdSelecionado('')
      setPresetReconhecido(null)
      await recarregar()
    } catch (err) {
      mostrarToast(err instanceof Error ? err.message : 'Erro ao cadastrar taxa.', 'erro')
    }
  }

  async function handleExcluir(id: number) {
    try {
      await excluirTaxa(id)
      mostrarToast('Taxa excluída!')
      setTaxaExcluindoId(null)
      await recarregar()
    } catch (err) {
      mostrarToast(err instanceof Error ? err.message : 'Erro ao excluir taxa.', 'erro')
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-on-surface">Taxas de Marketplace & Meios de Pagamento</h1>
        <p className="text-label-sm text-on-surface-variant">
          Comissões da Shopee, Mercado Livre, Elo7, taxas de maquininha de cartão e custos fixos por venda.
        </p>
      </div>

      <Card>
        <h2 className="mb-3 font-medium text-on-surface">Nova Taxa / Canal de Venda</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Seletor Automático de Plataformas / Presets */}
          <div className="flex flex-col gap-1.5 rounded-xl border border-primary/30 bg-primary/5 p-3.5">
            <label htmlFor="select-preset-plataforma" className="text-xs font-bold uppercase text-primary flex items-center gap-1.5">
              ⚡ Preenchimento Automático por Plataforma / Canal
            </label>
            <p className="text-xs text-on-surface-variant">
              Selecione uma plataforma abaixo ou comece a digitar o nome do canal para aplicar automaticamente as taxas oficiais vigentes. Você pode editar qualquer valor livremente depois.
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
              <option value="">+ Escolher plataforma conhecida (Shopee, Mercado Livre, Elo7, Amazon, Shein, Kiwify, Pix...)</option>
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
                <Badge variant="success" className="whitespace-nowrap">Taxa Sugerida Carregada</Badge>
              </div>
            )}
          </div>

          <TextField
            id="nome-taxa"
            rotulo="Nome do Canal ou Plataforma"
            placeholder="Ex: Shopee Comércio Geral / Elo7 / Cartão de Crédito"
            value={nome}
            onChange={(e) => handleMudarNome(e.target.value)}
          />

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="w-full sm:w-1/2">
              <TextField
                id="percentual-taxa"
                rotulo="Comissão Percentual (%)"
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
                rotulo="Taxa Fixa por Venda (R$)"
                type="number"
                step="0.01"
                placeholder="Ex: 4.00"
                value={valorFixo}
                onChange={(e) => setValorFixo(e.target.value)}
              />
            </div>
          </div>

          <Button type="submit">Cadastrar Taxa</Button>
        </form>
      </Card>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-on-surface">Canais & Taxas Cadastradas</h2>
        {taxas.length === 0 ? (
          <EmptyState
            titulo="Nenhuma taxa cadastrada"
            descricao="Cadastre os canais de venda que você utiliza para calcular o preço ideal repassando as comissões."
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {taxas.map((tx) => (
              <Card key={tx.id} className="glow-hover">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-medium text-on-surface">{tx.nome}</h3>
                    <p className="text-label-sm text-on-surface-variant mt-1">
                      Comissão: <strong>{tx.percentual.toFixed(2)}%</strong>
                      {tx.valorFixo > 0 ? ` + R$ ${tx.valorFixo.toFixed(2)} fixo` : ''}
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
        titulo="Excluir taxa?"
        descricao="Esta ação não afetará precificações anteriores já gravadas."
        onConfirmar={() => taxaExcluindoId !== null && handleExcluir(taxaExcluindoId)}
        onCancelar={() => setTaxaExcluindoId(null)}
      />
    </div>
  )
}
