import { useEffect, useRef, useState } from 'react'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { pedirDicaIA } from '../ia/geminiClient'
import type { ResumoDashboard } from './dashboardRepo'

const CACHE_KEY = 'miaudelier_resumo_ia_cache_v2'
const CACHE_DURATION_MS = 6 * 60 * 60 * 1000

interface CacheResumoIa {
  resposta: string
  origem: 'gemini' | 'local'
  timestamp: number
  assinatura: string
}

function assinaturaDoResumo(resumo: ResumoDashboard): string {
  return JSON.stringify({
    saldoTotal: resumo.saldoTotal,
    lucroDoMes: resumo.lucroDoMes,
    materiaisEstoqueBaixo: resumo.materiaisEstoqueBaixo,
    pecasEmProducao: resumo.pecasEmProducao,
    pecasEmCura: resumo.pecasEmCura,
    pedidosAbertos: resumo.pedidosAbertos,
    pedidosAtrasados: resumo.pedidosAtrasados,
    pecasSemPreco: resumo.pecasSemPreco,
    descontoCompras90Dias: resumo.descontoCompras90Dias,
    comprasComDesconto90Dias: resumo.comprasComDesconto90Dias,
    tendenciasPrecoMateriais: resumo.tendenciasPrecoMateriais,
  })
}

function obterCacheValido(assinatura: string): CacheResumoIa | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed: CacheResumoIa = JSON.parse(raw)
    if (!parsed || typeof parsed.timestamp !== 'number' || !parsed.resposta || parsed.assinatura !== assinatura) return null
    const idade = Date.now() - parsed.timestamp
    if (idade < CACHE_DURATION_MS) {
      return parsed
    }
    return null
  } catch {
    return null
  }
}

function salvarCache(resposta: string, origem: 'gemini' | 'local', assinatura: string) {
  try {
    const item: CacheResumoIa = {
      resposta,
      origem,
      timestamp: Date.now(),
      assinatura,
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify(item))
  } catch {
    // Falha silenciosa de gravação
  }
}

function montarPergunta(resumo: ResumoDashboard): string {
  const tendencias = resumo.tendenciasPrecoMateriais.length > 0
    ? resumo.tendenciasPrecoMateriais.map((tendencia) =>
      `- ${tendencia.nomeMaterial}: custo por ${tendencia.unidade} mudou de R$ ${tendencia.custoAnterior.toFixed(2)} em ${tendencia.dataAnterior} para R$ ${tendencia.custoAtual.toFixed(2)} em ${tendencia.dataAtual} (${tendencia.variacaoPercentual.toFixed(1)}%).`,
    ).join('\n')
    : '- Ainda não há duas compras registradas de um mesmo material para comparar preços.'

  return `Você é uma consultora sênior de gestão para ateliês de resina epóxi e artesanato. Use SOMENTE os fatos abaixo; não invente épocas promocionais, preços de mercado, prazos ou tendências externas.

Dados atuais do ateliê:
- Saldo total em caixa: R$ ${resumo.saldoTotal.toFixed(2)}
- Resultado financeiro do mês: R$ ${resumo.lucroDoMes.toFixed(2)}
- Peças em produção: ${resumo.pecasEmProducao}
- Peças em cura no ateliê: ${resumo.pecasEmCura}
- Materiais com estoque baixo/crítico: ${resumo.materiaisEstoqueBaixo}
- Pedidos em aberto: ${resumo.pedidosAbertos}
- Pedidos com prazo vencido: ${resumo.pedidosAtrasados}
- Peças ativas sem preço de venda definido: ${resumo.pecasSemPreco}
- Descontos obtidos em compras nos últimos 90 dias: R$ ${resumo.descontoCompras90Dias.toFixed(2)} em ${resumo.comprasComDesconto90Dias} compra(s)

Comparação entre as duas últimas compras registradas por material:
${tendencias}

Responda em português do Brasil, com no máximo 4 bullets curtos. Priorize uma ação imediata, uma oportunidade de economia/compra e uma ação de precificação/venda quando os dados permitirem. Cite os valores relevantes. Quando faltarem dados históricos, diga claramente qual registro ainda precisa ser feito; não faça previsões.`
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

  if (resumo.pedidosAtrasados > 0) {
    frases.push(`⏰ Prazo: ${resumo.pedidosAtrasados} pedido(s) já passou/passaram da data de entrega. Priorize a confirmação com o cliente e a finalização.`)
  }

  if (resumo.pecasSemPreco > 0) {
    frases.push(`🏷️ Precificação: ${resumo.pecasSemPreco} peça(s) ativa(s) ainda não possui(em) preço de venda. Complete a precificação antes de anunciar ou aceitar pedidos.`)
  }

  if (resumo.comprasComDesconto90Dias > 0) {
    frases.push(`💡 Economia: foram aproveitados R$ ${resumo.descontoCompras90Dias.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} em descontos nas últimas ${resumo.comprasComDesconto90Dias} compra(s). Continue registrando cupom e frete para comparar fornecedores.`)
  }

  const aumentoMaior = resumo.tendenciasPrecoMateriais.find((tendencia) => tendencia.variacaoPercentual >= 5)
  if (aumentoMaior) {
    frases.push(`📈 Compra: o custo de ${aumentoMaior.nomeMaterial} subiu ${aumentoMaior.variacaoPercentual.toFixed(1)}% na última reposição. Revise o custo das próximas peças antes de manter o mesmo preço de venda.`)
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
  const assinatura = assinaturaDoResumo(resumo)

  async function gerarResumo(forcarAtualizacao = false) {
    if (!forcarAtualizacao) {
      const cacheValido = obterCacheValido(assinatura)
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
      salvarCache(textoGemini, 'gemini', assinatura)
    } catch {
      if (!montado.current) return
      const textoLocal = gerarDiagnosticoLocal(resumo)
      setResposta(textoLocal)
      setOrigem('local')
      salvarCache(textoLocal, 'local', assinatura)
    } finally {
      if (montado.current) setCarregando(false)
    }
  }

  useEffect(() => {
    montado.current = true
    // eslint-disable-next-line react-hooks/set-state-in-effect
    gerarResumo(false)
    return () => {
      montado.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assinatura])

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
          <p className="whitespace-pre-line text-xs font-normal leading-relaxed text-on-surface sm:text-sm">
            {resposta || gerarDiagnosticoLocal(resumo)}
          </p>
        )}
      </div>
    </Card>
  )
}

