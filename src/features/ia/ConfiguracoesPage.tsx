import { useEffect, useRef, useState } from 'react'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { useToast } from '../../components/ui/useToast'
import {
  definirPersonalidade,
  obterPersonalidade,
  type Personalidade,
} from './iaConfigRepo'
import { configurarChaveGemini } from './geminiClient'


export function ConfiguracoesPage() {
  const { mostrarToast } = useToast()
  const montado = useRef(true)
  const [personalidade, setPersonalidadeEstado] = useState<Personalidade>('tecnica')
  const [chaveGemini, setChaveGemini] = useState('')
  const [salvandoChave, setSalvandoChave] = useState(false)

  async function recarregar() {
    const personalidadeAtual = await obterPersonalidade()
    if (!montado.current) return
    setPersonalidadeEstado(personalidadeAtual)
  }

  useEffect(() => {
    montado.current = true
    recarregar().catch((falha) => {
      if (!montado.current) return
      mostrarToast(falha instanceof Error ? falha.message : 'Erro ao carregar configurações.', 'erro')
    })
    return () => {
      montado.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleMudarPersonalidade(evento: React.ChangeEvent<HTMLSelectElement>) {
    const nova = evento.target.value as Personalidade
    setPersonalidadeEstado(nova)
    try {
      await definirPersonalidade(nova)
    } catch (falha) {
      if (!montado.current) return
      mostrarToast(falha instanceof Error ? falha.message : 'Erro ao salvar personalidade.', 'erro')
    }
  }

  async function handleSalvarChave(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const chave = chaveGemini.trim()
    if (!chave) {
      mostrarToast('Informe a chave Gemini.', 'erro')
      return
    }

    setSalvandoChave(true)
    try {
      await configurarChaveGemini(chave)
      if (!montado.current) return
      setChaveGemini('')
      mostrarToast('Chave Gemini salva com segurança no servidor.', 'sucesso')
    } catch (falha) {
      if (!montado.current) return
      mostrarToast(falha instanceof Error ? falha.message : 'Erro ao salvar a chave Gemini.', 'erro')
    } finally {
      if (montado.current) setSalvandoChave(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-on-surface">Configurações</h1>
        <p className="text-label-sm text-on-surface-variant">Assistente de IA e preferências do ateliê.</p>
      </div>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-on-surface-variant">Assistente</h2>
        <Card>
          <label htmlFor="personalidade-ia" className="text-sm font-medium text-on-surface">Personalidade do assistente</label>
          <select
            id="personalidade-ia"
            value={personalidade}
            onChange={handleMudarPersonalidade}
            className="mt-1 w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
          >
            <option value="tecnica">Técnica</option>
            <option value="acolhedora">Acolhedora</option>
            <option value="direta">Direta</option>
          </select>
        </Card>
        <Card className="mt-4">
          <form onSubmit={handleSalvarChave} className="flex flex-col gap-3">
            <div>
              <label htmlFor="chave-gemini" className="text-sm font-medium text-on-surface">Chave da API Gemini</label>
              <p className="mt-1 text-xs text-on-surface-variant">A chave é enviada diretamente ao servidor seguro e não fica salva neste navegador.</p>
            </div>
            <input
              id="chave-gemini"
              type="password"
              autoComplete="off"
              value={chaveGemini}
              onChange={(evento) => setChaveGemini(evento.target.value)}
              className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
            <div>
              <Button type="submit" disabled={salvandoChave}>{salvandoChave ? 'Salvando...' : 'Salvar chave Gemini'}</Button>
            </div>
          </form>
        </Card>
      </section>
    </div>
  )
}


