import { useRef, useState } from 'react'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { useToast } from '../../components/ui/useToast'
import { pedirDicaIA } from '../ia/geminiClient'
import type { ResumoDashboard } from './dashboardRepo'

function montarPergunta(resumo: ResumoDashboard): string {
  return `Você é consultora de negócios de uma artesã de resina epóxi. Com base nestes números do ateliê dela, escreva um resumo curto (3 a 5 frases, sem tópicos) destacando o que está indo bem e o que merece atenção agora:
- Saldo total em caixa: R$ ${resumo.saldoTotal.toFixed(2)}
- Lucro do mês: R$ ${resumo.lucroDoMes.toFixed(2)}
- Peças em produção: ${resumo.pecasEmProducao}
- Peças em cura: ${resumo.pecasEmCura}
- Materiais com estoque baixo: ${resumo.materiaisEstoqueBaixo}
- Pedidos em aberto: ${resumo.pedidosAbertos}`
}

export function ResumoLojaCard({ resumo }: { resumo: ResumoDashboard }) {
  const { mostrarToast } = useToast()
  const montado = useRef(true)
  const [resposta, setResposta] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(false)

  async function handleGerar() {
    setCarregando(true)
    try {
      const texto = await pedirDicaIA(montarPergunta(resumo))
      if (!montado.current) return
      setResposta(texto)
    } catch (falha) {
      if (!montado.current) return
      mostrarToast(falha instanceof Error ? falha.message : 'Assistente indisponível agora.', 'erro')
    } finally {
      if (montado.current) setCarregando(false)
    }
  }

  return (
    <Card className="glow-hover">
      <div className="flex items-center justify-between gap-3">
        <p className="font-medium text-on-surface">Resumo da IA</p>
        <Button variante="ghost" onClick={handleGerar} disabled={carregando}>
          {carregando ? 'Gerando...' : resposta ? 'Atualizar' : 'Gerar resumo'}
        </Button>
      </div>
      {resposta && <p className="mt-2 text-sm text-on-surface-variant">{resposta}</p>}
    </Card>
  )
}
