import { useEffect, useState } from 'react'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import {
  gerarDiagnosticoFinanceiro,
  type DiagnosticoFinanceiro,
  type SeveridadeInconsistencia,
} from './diagnosticoRepo'
import { gerarPdfDiagnostico } from './diagnosticoPdf'

function badgeVariante(sev: SeveridadeInconsistencia): 'neutral' | 'success' | 'warning' | 'danger' {
  switch (sev) {
    case 'critica':
      return 'danger'
    case 'alta':
      return 'danger'
    case 'media':
      return 'warning'
    case 'baixa':
      return 'neutral'
  }
}

export function DiagnosticoPage() {
  const [diag, setDiag] = useState<DiagnosticoFinanceiro | null>(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    gerarDiagnosticoFinanceiro()
      .then((resultado) => {
        setDiag(resultado)
        setCarregando(false)
      })
      .catch(() => setCarregando(false))
  }, [])

  if (carregando || !diag) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-xl font-semibold text-on-surface">Diagnóstico Financeiro</h1>
        <p className="text-sm text-on-surface-variant">Analisando conciliação e dados de caixa...</p>
      </div>
    )
  }

  const formatarMoeda = (val: number) =>
    val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-on-surface">Diagnóstico & Saúde Financeira</h1>
          <p className="text-label-sm text-on-surface-variant">
            Conciliação de caixa e análise de integridade da operação.
          </p>
        </div>
        <Button onClick={() => gerarPdfDiagnostico(diag)}>
          📄 Baixar Relatório PDF
        </Button>
      </div>

      <Card className="flex flex-col items-center justify-between gap-4 p-6 sm:flex-row">
        <div>
          <h2 className="text-lg font-bold text-on-surface">Índice de Saúde Financeira</h2>
          <p className="text-sm text-on-surface-variant">
            Nota calculada a partir de auditoria automática e ausência de inconsistências.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-4xl font-extrabold text-primary">{diag.scoreSaude}</span>
          <span className="text-lg font-medium text-on-surface-variant">/ 100</span>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="flex flex-col gap-1">
          <p className="text-xs text-on-surface-variant">Entradas Totais</p>
          <p className="text-lg font-bold text-primary">{formatarMoeda(diag.entradasTotais)}</p>
        </Card>
        <Card className="flex flex-col gap-1">
          <p className="text-xs text-on-surface-variant">Saídas Totais</p>
          <p className="text-lg font-bold text-error">{formatarMoeda(diag.saidasTotais)}</p>
        </Card>
        <Card className="flex flex-col gap-1">
          <p className="text-xs text-on-surface-variant">Saldo Conciliado</p>
          <p className="text-lg font-bold text-on-surface">{formatarMoeda(diag.saldoConciliado)}</p>
        </Card>
        <Card className="flex flex-col gap-1">
          <p className="text-xs text-on-surface-variant">Saldo Atual Acumulado</p>
          <p className="text-lg font-bold text-on-surface">{formatarMoeda(diag.saldoAtualContas)}</p>
        </Card>
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="text-base font-semibold text-on-surface">Análise de Riscos e Inconsistências</h2>
        {diag.inconsistencias.length === 0 ? (
          <Card className="border-emerald-500/30 bg-emerald-500/10 p-4">
            <p className="text-sm font-medium text-emerald-400">
              ✓ Nenhuma inconsistência detectada. O caixa do ateliê está conciliado e saudável!
            </p>
          </Card>
        ) : (
          <ul className="flex flex-col gap-3">
            {diag.inconsistencias.map((inc, index) => (
              <Card key={index} className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-on-surface">{inc.titulo}</h3>
                  <Badge variant={badgeVariante(inc.severidade)}>
                    {inc.severidade.toUpperCase()}
                  </Badge>
                </div>
                <p className="text-sm text-on-surface-variant">{inc.descricao}</p>
              </Card>
            ))}
          </ul>
        )}
      </section>

    </div>
  )
}
