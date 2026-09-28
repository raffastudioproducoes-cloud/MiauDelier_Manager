import { useEffect, useRef, useState } from 'react'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { pedirDicaIA } from '../ia/geminiClient'
import type { ResumoDashboard } from './dashboardRepo'

const CACHE_KEY = 'miaudelier_resumo_ia_cache_v1'
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000 // 24 horas

interface CacheResumoIa {
  resposta: string
  origem: 'gemini' | 'local'
  timestamp: number
}

function obterCacheValido(): CacheResumoIa | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed: CacheResumoIa = JSON.parse(raw)
    if (!parsed || typeof parsed.timestamp !== 'number' || !parsed.resposta) return null
    const idade = Date.now() - parsed.timestamp
    if (idade < CACHE_DURATION_MS) {
      return parsed
    }
    return null
  } catch {
    return null
  }
}

function salvarCache(resposta: string, origem: 'gemini' | 'local') {
  try {
    const item: CacheResumoIa = {
      resposta,
      origem,
      timestamp: Date.now(),
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify(item))
  } catch {
    // Falha silenciosa de gravação
  }
}

function montarPergunta(resumo: ResumoDashboard): string {
  return `Você é consultora sênior de negócios para ateliês de resina epóxi e artesanato. Com base nestes números atuais do ateliê, escreva uma análise executiva direta e prática (de 3 a 5 frases):
- Saldo total em caixa: R$ ${resumo.saldoTotal.toFixed(2)}
- Lucro do mês: R$ ${resumo.lucroDoMes.toFixed(2)}
- Peças em produção: ${resumo.pecasEmProducao}
- Peças em cura no ateliê: ${resumo.pecasEmCura}
- Materiais com estoque baixo/crítico: ${resumo.materiaisEstoqueBaixo}
- Pedidos em aberto: ${resumo.pedidosAbertos}

Destaque pontos fortes de caixa, prazos de entrega, precificação e alertas urgentes de reposição de insumos.`
}

function gerarDiagnosticoLocal(resumo: ResumoDashboard): string {
  const frases: string[] = []

  // Caixa e Lucro
  if (resumo.saldoTotal > 0) {
    frases.push(
      `Caixa atual saudável de R$ ${resumo.saldoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} com lucro mensal acumulado de R$ ${resumo.lucroDoMes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`
    )
  } else {
    frases.push(
      `Alerta Financeiro: Saldo zerado ou negativo (R$ ${resumo.saldoTotal.toFixed(2)}). Recomenda-se rever a precificação das peças e focar em vendas imediatas.`
    )
  }

  // Estoque de Insumos
  if (resumo.materiaisEstoqueBaixo > 0) {
    frases.push(
      `📦 Estoque Crítico: ${resumo.materiaisEstoqueBaixo} material(is) (resina, silicone ou pigmentos) atingiram o nível baixo — providencie a compra para não pausar a produção.`
    )
  } else {
    frases.push(`📦 Estoque de insumos abastecido e sob controle.`)
  }

  // Produção e Cura
  if (resumo.pecasEmCura > 0 || resumo.pecasEmProducao > 0) {
    frases.push(
      `✨ Operacional: ${resumo.pecasEmProducao} peça(s) em produção e ${resumo.pecasEmCura} em estufa/fase de cura no ateliê.`
    )
  }

  // Pedidos
  if (resumo.pedidosAbertos > 0) {
    frases.push(
      `🛍️ Comercial: ${resumo.pedidosAbertos} pedido(s) em aberto aguardando envio aos clientes — mantenha a atenção aos prazos de postagem.`
    )
  } else {
    frases.push(`🛍️ Nenhum pedido pendente de entrega no momento.`)
  }

  return frases.join(' ')
}

export function ResumoLojaCard({ resumo }: { resumo: ResumoDashboard }) {
  const montado = useRef(true)
  const [resposta, setResposta] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [origem, setOrigem] = useState<'gemini' | 'local'>('local')

  async function gerarResumo(forcarAtualizacao = false) {
    if (!forcarAtualizacao) {
      const cacheValido = obterCacheValido()
      if (cacheValido) {
        setResposta(cacheValido.resposta)
        setOrigem(cacheValido.origem)
        return
      }
    }

    setCarregando(true)
    try {
      const textoGemini = await pedirDicaIA(montarPergunta(resumo))
      if (!montado.current) return
      setResposta(textoGemini)
      setOrigem('gemini')
      salvarCache(textoGemini, 'gemini')
    } catch {
      if (!montado.current) return
      const textoLocal = gerarDiagnosticoLocal(resumo)
      setResposta(textoLocal)
      setOrigem('local')
      salvarCache(textoLocal, 'local')
    } finally {
      if (montado.current) setCarregando(false)
    }
  }

  useEffect(() => {
    montado.current = true
    gerarResumo(false)
    return () => {
      montado.current = false
    }
  }, [resumo.saldoTotal, resumo.lucroDoMes, resumo.materiaisEstoqueBaixo, resumo.pecasEmProducao, resumo.pedidosAbertos])

  return (
    <Card className="glow-hover bg-gradient-to-br from-surface via-surface-container-low/50 to-surface-container/30 border border-outline-variant/40 shadow-lg p-5 rounded-2xl transition-all">
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">🤖</span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-base text-on-surface tracking-tight">Resumo da IA</h2>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary uppercase tracking-wider">
                {origem === 'gemini' ? 'Gemini 2.5' : 'Diagnóstico Ateliê'}
              </span>
            </div>
            <p className="text-xs text-on-surface-variant">Análise inteligente de caixa, insumos e produção do ateliê</p>
          </div>
        </div>
        <Button variante="ghost" onClick={() => gerarResumo(true)} disabled={carregando} className="text-xs py-1.5 px-3">
          {carregando ? 'Analisando...' : '🔄 Atualizar'}
        </Button>
      </div>

      <div className="mt-3 p-3.5 rounded-xl bg-surface-container-high/30 border border-outline-variant/30 backdrop-blur-sm">
        {carregando ? (
          <div className="flex items-center gap-2 text-xs text-on-surface-variant animate-pulse py-1">
            <span className="animate-spin text-sm">✨</span>
            <span>Gerando diagnóstico inteligente do ateliê...</span>
          </div>
        ) : (
          <p className="text-xs sm:text-sm leading-relaxed text-on-surface font-normal">
            {resposta || gerarDiagnosticoLocal(resumo)}
          </p>
        )}
      </div>
    </Card>
  )
}

