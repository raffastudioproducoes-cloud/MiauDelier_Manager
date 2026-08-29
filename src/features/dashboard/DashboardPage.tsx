import { useEffect, useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { useToast } from '../../components/ui/useToast'
import { obterResumoDashboard, type ResumoDashboard } from './dashboardRepo'
import { FluxoCaixaChart } from './FluxoCaixaChart'

const RESUMO_VAZIO: ResumoDashboard = {
  saldoTotal: 0,
  lucroDoMes: 0,
  pecasEmProducao: 0,
  pecasEmCura: 0,
  materiaisEstoqueBaixo: 0,
  pedidosAbertos: 0,
  fluxoCaixa14Dias: [],
  eventosRecentes: [],
}

function formatarMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function DashboardPage() {
  const navigate = useNavigate()
  const { mostrarToast } = useToast()
  const montado = useRef(true)
  const [resumo, setResumo] = useState<ResumoDashboard>(RESUMO_VAZIO)
  const [carregado, setCarregado] = useState(false)
  const [erroCarga, setErroCarga] = useState(false)

  useEffect(() => {
    montado.current = true
    obterResumoDashboard()
      .then((dados) => {
        if (!montado.current) return
        setResumo(dados)
        setCarregado(true)
      })
      .catch((falha) => {
        if (!montado.current) return
        mostrarToast(falha instanceof Error ? falha.message : 'Erro ao carregar o resumo.', 'erro')
        setErroCarga(true)
        setCarregado(true)
      })
    return () => {
      montado.current = false
    }
  }, [])

  if (!carregado) {
    return <p>Carregando...</p>
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Início</h1>

      {erroCarga ? (
        <Card>
          <p role="alert" className="text-sm text-[var(--color-danger)]">
            Não foi possível carregar o resumo. Tente novamente.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Card><p className="text-xs text-[var(--color-ink-muted)]">Saldo total</p><p className="text-lg font-semibold">{formatarMoeda(resumo.saldoTotal)}</p></Card>
          <Card><p className="text-xs text-[var(--color-ink-muted)]">Lucro do mês</p><p className="text-lg font-semibold">{formatarMoeda(resumo.lucroDoMes)}</p></Card>
          <Card><p className="text-xs text-[var(--color-ink-muted)]">Peças em produção</p><p className="text-lg font-semibold">{resumo.pecasEmProducao}</p></Card>
          <Card><p className="text-xs text-[var(--color-ink-muted)]">Peças em cura</p><p className="text-lg font-semibold">{resumo.pecasEmCura}</p></Card>
          <Card><p className="text-xs text-[var(--color-ink-muted)]">Estoque baixo</p><p className="text-lg font-semibold">{resumo.materiaisEstoqueBaixo}</p></Card>
          <Card><p className="text-xs text-[var(--color-ink-muted)]">Pedidos em aberto</p><p className="text-lg font-semibold">{resumo.pedidosAbertos}</p></Card>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => navigate({ to: '/pecas' })}>Nova peça</Button>
        <Button onClick={() => navigate({ to: '/pedidos' })}>Novo pedido</Button>
        <Button onClick={() => navigate({ to: '/materiais' })}>Novo material</Button>
        <Button onClick={() => navigate({ to: '/transacoes' })}>Nova transação</Button>
      </div>

      {!erroCarga && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2">
            <FluxoCaixaChart dados={resumo.fluxoCaixa14Dias} />
          </Card>
          <Card>
            <p className="text-sm font-medium mb-2">Eventos recentes de produção</p>
            {resumo.eventosRecentes.length === 0 ? (
              <p className="text-sm text-[var(--color-ink-muted)]">Nenhum evento registrado ainda.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {resumo.eventosRecentes.map((evento, indice) => (
                  <li key={`${evento.pecaId}-${indice}`} className="text-sm">
                    <Badge variant="neutral">{evento.tipo}</Badge> <span className="font-medium">{evento.nomePeca}</span>
                    <p className="text-xs text-[var(--color-ink-muted)]">{evento.descricao}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}
    </div>
  )
}
