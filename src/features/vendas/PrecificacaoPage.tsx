import { useEffect, useMemo, useRef, useState } from 'react'
import { Card } from '../../components/ui/Card'
import { TextField } from '../../components/ui/TextField'
import { Button } from '../../components/ui/Button'
import { useToast } from '../../components/ui/useToast'
import { calcularPrecificacao } from '../pricing/pricing'
import { listarPecas, listarConsumosDaPeca, atualizarPrecoVendaPeca, type PecaComForma } from '../producao/pecasRepo'
import { listarMateriais } from '../producao/materiaisRepo'

function formatarMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function PrecificacaoPage() {
  const { mostrarToast } = useToast()
  const montado = useRef(true)
  const [pecas, setPecas] = useState<PecaComForma[]>([])
  const [pecaSelecionadaId, setPecaSelecionadaId] = useState('')
  const [custoMaterial, setCustoMaterial] = useState('')
  const [custoAcessorios, setCustoAcessorios] = useState('')
  const [horasProducao, setHorasProducao] = useState('')
  const [valorHora, setValorHora] = useState('')
  const [rateioFixoPercent, setRateioFixoPercent] = useState('')
  const [margemLucroPercent, setMargemLucroPercent] = useState('')

  useEffect(() => {
    montado.current = true
    listarPecas()
      .then((lista) => {
        if (!montado.current) return
        setPecas(lista)
      })
      .catch((falha) => {
        if (!montado.current) return
        mostrarToast(falha instanceof Error ? falha.message : 'Erro ao carregar peças.', 'erro')
      })
    return () => {
      montado.current = false
    }
  }, [])

  async function handleSelecionarPeca(id: string) {
    setPecaSelecionadaId(id)
    if (!id) return
    try {
      const [consumos, materiais] = await Promise.all([listarConsumosDaPeca(Number(id)), listarMateriais()])
      if (!montado.current) return
      const soma = consumos.reduce((acumulado, consumo) => {
        const material = materiais.find((m) => m.id === consumo.materialId)
        return acumulado + consumo.quantidade * (material?.custoUnitario ?? 0)
      }, 0)
      setCustoMaterial(String(soma))
    } catch (falha) {
      if (!montado.current) return
      mostrarToast(falha instanceof Error ? falha.message : 'Erro ao carregar dados da peça.', 'erro')
    }
  }

  const todosVazios = [custoMaterial, custoAcessorios, horasProducao, valorHora, rateioFixoPercent, margemLucroPercent].every(
    (valor) => valor === '',
  )

  const { resultado, erroValidacao } = useMemo(() => {
    try {
      const calculado = calcularPrecificacao({
        custoMaterial: Number(custoMaterial) || 0,
        custoAcessorios: Number(custoAcessorios) || 0,
        horasProducao: Number(horasProducao) || 0,
        valorHora: Number(valorHora) || 0,
        rateioFixoPercent: Number(rateioFixoPercent) || 0,
        margemLucroPercent: Number(margemLucroPercent) || 0,
      })
      return { resultado: calculado, erroValidacao: null }
    } catch (falha) {
      return { resultado: null, erroValidacao: falha instanceof Error ? falha.message : 'Dados inválidos.' }
    }
  }, [custoMaterial, custoAcessorios, horasProducao, valorHora, rateioFixoPercent, margemLucroPercent])

  async function handleSalvarPreco() {
    if (!pecaSelecionadaId || !resultado) return
    try {
      await atualizarPrecoVendaPeca(Number(pecaSelecionadaId), resultado.precoFinal)
      mostrarToast('Preço de venda salvo na peça.')
    } catch (falha) {
      mostrarToast(falha instanceof Error ? falha.message : 'Erro ao salvar preço de venda.', 'erro')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Precificação</h1>
      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="peca-precificacao" className="text-sm font-medium text-[var(--color-ink)]">
              Peça (opcional)
            </label>
            <select
              id="peca-precificacao"
              value={pecaSelecionadaId}
              onChange={(e) => handleSelecionarPeca(e.target.value)}
              className="rounded-lg px-3 py-2 elevation-inset"
            >
              <option value="">Nenhuma</option>
              {pecas.map((peca) => (
                <option key={peca.id} value={peca.id}>{peca.nome}</option>
              ))}
            </select>
          </div>
          <TextField id="custo-material" rotulo="Custo do material (R$)" type="number" value={custoMaterial} onChange={(e) => setCustoMaterial(e.target.value)} />
          <TextField id="custo-acessorios" rotulo="Acessórios (R$)" type="number" value={custoAcessorios} onChange={(e) => setCustoAcessorios(e.target.value)} />
          <TextField id="horas-producao" rotulo="Horas de produção" type="number" value={horasProducao} onChange={(e) => setHorasProducao(e.target.value)} />
          <TextField id="valor-hora" rotulo="Valor da hora (R$)" type="number" value={valorHora} onChange={(e) => setValorHora(e.target.value)} />
          <TextField id="rateio-fixo" rotulo="Rateio de custo fixo (%)" type="number" value={rateioFixoPercent} onChange={(e) => setRateioFixoPercent(e.target.value)} />
          <TextField id="margem-lucro" rotulo="Margem de lucro (%)" type="number" value={margemLucroPercent} onChange={(e) => setMargemLucroPercent(e.target.value)} />
        </div>

        {todosVazios ? (
          <p className="mt-4 text-sm text-[var(--color-ink-muted)]">Preencha os campos para calcular</p>
        ) : resultado ? (
          <div className="mt-4 flex flex-col gap-1">
            <p className="text-sm text-[var(--color-ink-muted)]">Custo direto: {formatarMoeda(resultado.custoDireto)}</p>
            <p className="text-sm text-[var(--color-ink-muted)]">Mão de obra: {formatarMoeda(resultado.custoMaoDeObra)}</p>
            <p className="text-sm text-[var(--color-ink-muted)]">Custo fixo: {formatarMoeda(resultado.custoFixo)}</p>
            <p className="text-sm text-[var(--color-ink-muted)]">Lucro: {formatarMoeda(resultado.lucro)}</p>
            <p className="text-lg font-semibold text-[var(--color-accent)]">Preço final: {formatarMoeda(resultado.precoFinal)}</p>
          </div>
        ) : (
          <p className="mt-4 text-lg font-semibold">Preço final: —</p>
        )}

        {erroValidacao && (
          <p role="alert" className="text-sm text-[var(--color-danger)]">{erroValidacao}</p>
        )}

        {pecaSelecionadaId && resultado && !todosVazios && (
          <Button className="mt-4" onClick={handleSalvarPreco}>Salvar como preço de venda</Button>
        )}
      </Card>
    </div>
  )
}
