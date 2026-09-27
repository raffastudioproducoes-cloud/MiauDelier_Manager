import jsPDF from 'jspdf'
import type { DiagnosticoFinanceiro } from './diagnosticoRepo'

export function gerarPdfDiagnostico(diagnostico: DiagnosticoFinanceiro): void {
  const doc = new jsPDF()

  // Cabeçalho
  doc.setFillColor(15, 23, 42) // #0f172a
  doc.rect(0, 0, 210, 35, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('MiauDelier Manager', 14, 18)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('Relatório de Diagnóstico e Conciliação Financeira', 14, 26)

  const dataFormatada = new Date(diagnostico.geradoEm).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
  doc.text(`Gerado em: ${dataFormatada}`, 140, 26)

  // Placa de Score de Saúde
  let colorScore = [34, 197, 94] // verde
  if (diagnostico.scoreSaude < 60) colorScore = [239, 68, 68] // vermelho
  else if (diagnostico.scoreSaude < 85) colorScore = [234, 179, 8] // amarelo

  doc.setFillColor(colorScore[0], colorScore[1], colorScore[2])
  doc.roundedRect(14, 42, 182, 24, 3, 3, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text(`Índice de Saúde Financeira: ${diagnostico.scoreSaude} / 100`, 20, 57)

  // Resumo numérico
  let y = 78
  doc.setTextColor(15, 23, 42)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('Resumo de Caixa e Lançamentos', 14, y)

  y += 8
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')

  const formatarMoeda = (val: number) =>
    val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  doc.text(`• Entradas Totais: ${formatarMoeda(diagnostico.entradasTotais)}`, 14, y)
  y += 6
  doc.text(`• Saídas Totais: ${formatarMoeda(diagnostico.saidasTotais)}`, 14, y)
  y += 6
  doc.text(`• Saldo Conciliado (Entradas - Saídas): ${formatarMoeda(diagnostico.saldoConciliado)}`, 14, y)
  y += 6
  doc.text(`• Saldo Atual Acumulado nas Contas: ${formatarMoeda(diagnostico.saldoAtualContas)}`, 14, y)

  // Seção de Inconsistências
  y += 14
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('Análise de Inconsistências e Severidades', 14, y)

  y += 8
  if (diagnostico.inconsistencias.length === 0) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(34, 197, 94)
    doc.text('✓ Nenhum risco ou inconsistência financeira foi detectado no ateliê.', 14, y)
  } else {
    for (const inc of diagnostico.inconsistencias) {
      if (y > 270) {
        doc.addPage()
        y = 20
      }
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(185, 28, 28)
      doc.text(`[${inc.severidade.toUpperCase()}] ${inc.titulo}`, 14, y)

      y += 5
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(51, 65, 85)
      doc.text(inc.descricao, 14, y)
      y += 8
    }
  }

  // Rodapé
  doc.setFontSize(8)
  doc.setTextColor(148, 163, 184)
  doc.text('Documento impresso via MiauDelier Manager — MiauDelier Ateliê de Resina', 14, 285)

  doc.save(`Diagnostico_Financeiro_${new Date().toISOString().slice(0, 10)}.pdf`)
}
