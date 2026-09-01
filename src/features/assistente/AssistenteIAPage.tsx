import { useEffect, useRef, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { ConfirmModal } from '../../components/ui/ConfirmModal'
import { useToast } from '../../components/ui/useToast'
import { hasChaveConfigurada } from '../ia/iaConfigRepo'
import { pedirRespostaChat } from '../ia/geminiClient'
import { criarMensagemIA, listarMensagensIA, limparConversaIA } from './mensagensIARepo'
import type { MensagemIA } from '../../db/schema'

const TAMANHO_MAXIMO_PERGUNTA = 500

export function AssistenteIAPage() {
  const { mostrarToast } = useToast()
  const [chaveConfigurada, setChaveConfigurada] = useState<boolean | null>(null)
  const [mensagens, setMensagens] = useState<MensagemIA[]>([])
  const [pergunta, setPergunta] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [confirmandoLimpeza, setConfirmandoLimpeza] = useState(false)

  const montado = useRef(true)

  useEffect(() => {
    montado.current = true
    return () => {
      montado.current = false
    }
  }, [])

  useEffect(() => {
    async function carregar() {
      try {
        const [configurada, lista] = await Promise.all([hasChaveConfigurada(), listarMensagensIA()])
        if (!montado.current) return
        setChaveConfigurada(configurada)
        setMensagens(lista)
      } catch (falha) {
        if (!montado.current) return
        mostrarToast(falha instanceof Error ? falha.message : 'Não foi possível carregar a conversa.', 'erro')
      }
    }
    carregar()
  }, [mostrarToast])

  async function handleEnviar() {
    const perguntaLimpa = pergunta.trim()
    if (!perguntaLimpa || perguntaLimpa.length > TAMANHO_MAXIMO_PERGUNTA || enviando) return
    setEnviando(true)
    try {
      await criarMensagemIA('usuario', perguntaLimpa)
      const historico = await listarMensagensIA()
      if (!montado.current) return
      setMensagens(historico)
      setPergunta('')

      const resposta = await pedirRespostaChat(historico, perguntaLimpa)
      await criarMensagemIA('assistente', resposta)
      if (!montado.current) return
      setMensagens(await listarMensagensIA())
    } catch (falha) {
      if (!montado.current) return
      mostrarToast(falha instanceof Error ? falha.message : 'Assistente indisponível agora.', 'erro')
    } finally {
      if (montado.current) setEnviando(false)
    }
  }

  async function handleLimparConversa() {
    try {
      await limparConversaIA()
      if (!montado.current) return
      setMensagens([])
    } catch (falha) {
      if (!montado.current) return
      mostrarToast(falha instanceof Error ? falha.message : 'Não foi possível limpar a conversa.', 'erro')
    } finally {
      if (montado.current) setConfirmandoLimpeza(false)
    }
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-headline-sm font-semibold text-on-surface">Assistente IA</h1>
        <Button variante="ghost" onClick={() => setConfirmandoLimpeza(true)} disabled={mensagens.length === 0}>
          Limpar conversa
        </Button>
      </div>

      {chaveConfigurada === false && (
        <div className="rounded-lg border border-outline-variant bg-surface-container p-3 text-sm text-on-surface-variant">
          Chave de API do Gemini não configurada. Configure em{' '}
          <span className="font-medium text-on-surface">/configuracoes</span> para usar o assistente.
        </div>
      )}

      <div className="flex flex-col gap-2">
        {mensagens.map((mensagem) => (
          <div
            key={mensagem.id}
            className={
              mensagem.papel === 'usuario'
                ? 'ml-auto max-w-[80%] rounded-xl bg-primary px-3 py-2 text-sm text-on-primary'
                : 'mr-auto max-w-[80%] rounded-xl bg-surface-container px-3 py-2 text-sm text-on-surface'
            }
          >
            {mensagem.texto}
          </div>
        ))}
        {mensagens.length === 0 && (
          <p className="text-sm text-on-surface-variant">Nenhuma mensagem ainda. Pergunte algo sobre o ofício.</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="pergunta-assistente" className="text-sm font-medium text-on-surface">
          Sua pergunta
        </label>
        <textarea
          id="pergunta-assistente"
          className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
          rows={3}
          value={pergunta}
          onChange={(evento) => setPergunta(evento.target.value)}
          disabled={enviando || chaveConfigurada === false}
        />
        <Button onClick={handleEnviar} disabled={enviando || chaveConfigurada === false}>
          {enviando ? 'Enviando...' : 'Enviar'}
        </Button>
      </div>

      <ConfirmModal
        aberto={confirmandoLimpeza}
        titulo="Limpar conversa"
        descricao="Isso apaga todo o histórico desta conversa. Essa ação não pode ser desfeita."
        onConfirmar={handleLimparConversa}
        onCancelar={() => setConfirmandoLimpeza(false)}
      />
    </div>
  )
}
