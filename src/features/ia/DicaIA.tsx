import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { TextField } from '../../components/ui/TextField'
import { useToast } from '../../components/ui/useToast'
import { pedirDicaIA } from './geminiClient'

export function DicaIA() {
  const { mostrarToast } = useToast()
  const [aberto, setAberto] = useState(false)
  const [pergunta, setPergunta] = useState('')
  const [resposta, setResposta] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function handlePerguntar() {
    if (!pergunta.trim() || enviando) return
    setEnviando(true)
    setResposta(null)
    try {
      const texto = await pedirDicaIA(pergunta.trim())
      setResposta(texto)
    } catch (falha) {
      mostrarToast(falha instanceof Error ? falha.message : 'Assistente indisponível agora.', 'erro')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="p-2 flex flex-col gap-2">
      <Button variante="ghost" onClick={() => setAberto((atual) => !atual)}>Pedir dica</Button>
      {aberto && (
        <div className="flex flex-col gap-2">
          <TextField
            id="pergunta-ia"
            rotulo="Sua pergunta"
            value={pergunta}
            onChange={(evento) => setPergunta(evento.target.value)}
          />
          <Button onClick={handlePerguntar} disabled={enviando}>Perguntar</Button>
          {resposta && <p className="text-sm text-[var(--color-ink-muted)]">{resposta}</p>}
        </div>
      )}
    </div>
  )
}
