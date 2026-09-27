import { useEffect, useRef, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { TextField } from '../../components/ui/TextField'
import { EmptyState } from '../../components/ui/EmptyState'
import { ConfirmModal } from '../../components/ui/ConfirmModal'
import { useToast } from '../../components/ui/useToast'
import {
  criarTaxa,
  listarTaxas,
  excluirTaxa,
} from './taxasRepo'
import type { Taxa } from '../../db/schema'

export function TaxasPage() {
  const { mostrarToast } = useToast()
  const [taxas, setTaxas] = useState<Taxa[]>([])
  const [nome, setNome] = useState('')
  const [percentual, setPercentual] = useState('')
  const [valorFixo, setValorFixo] = useState('')
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
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <TextField
            id="nome-taxa"
            rotulo="Nome do Canal (ex: Shopee Comércio Geral / Elo7 / Cartão de Crédito)"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="w-full sm:w-1/2">
              <TextField
                id="percentual-taxa"
                rotulo="Comissão Percentual (%)"
                type="number"
                value={percentual}
                onChange={(e) => setPercentual(e.target.value)}
              />
            </div>
            <div className="w-full sm:w-1/2">
              <TextField
                id="fixo-taxa"
                rotulo="Taxa Fixa por Venda (R$)"
                type="number"
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
