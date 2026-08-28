import { useMemo, useState } from 'react'
import { Card } from '../../components/ui/Card'
import { TextField } from '../../components/ui/TextField'
import { calcularPrecificacao } from '../pricing/pricing'

export function PrecificacaoPage() {
  const [custoMaterial, setCustoMaterial] = useState('')
  const [custoAcessorios, setCustoAcessorios] = useState('')
  const [horasProducao, setHorasProducao] = useState('')
  const [valorHora, setValorHora] = useState('')
  const [rateioFixoPercent, setRateioFixoPercent] = useState('')
  const [margemLucroPercent, setMargemLucroPercent] = useState('')

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

  const precoFormatado = resultado
    ? resultado.precoFinal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    : '—'

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Precificação</h1>
      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <TextField id="custo-material" rotulo="Custo do material (R$)" type="number" value={custoMaterial} onChange={(e) => setCustoMaterial(e.target.value)} />
          <TextField id="custo-acessorios" rotulo="Acessórios (R$)" type="number" value={custoAcessorios} onChange={(e) => setCustoAcessorios(e.target.value)} />
          <TextField id="horas-producao" rotulo="Horas de produção" type="number" value={horasProducao} onChange={(e) => setHorasProducao(e.target.value)} />
          <TextField id="valor-hora" rotulo="Valor da hora (R$)" type="number" value={valorHora} onChange={(e) => setValorHora(e.target.value)} />
          <TextField id="rateio-fixo" rotulo="Rateio de custo fixo (%)" type="number" value={rateioFixoPercent} onChange={(e) => setRateioFixoPercent(e.target.value)} />
          <TextField id="margem-lucro" rotulo="Margem de lucro (%)" type="number" value={margemLucroPercent} onChange={(e) => setMargemLucroPercent(e.target.value)} />
        </div>
        <p className="mt-4 text-lg font-semibold text-[var(--color-accent)]">Preço final: {precoFormatado}</p>
        {erroValidacao && (
          <p role="alert" className="text-sm text-[var(--color-danger)]">{erroValidacao}</p>
        )}
      </Card>
    </div>
  )
}
