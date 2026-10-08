import { useEffect, useRef, useState } from 'react'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { useToast } from '../../components/ui/useToast'
import {
  definirPersonalidade,
  obterPersonalidade,
  type Personalidade,
} from './iaConfigRepo'
import { configurarChaveGemini, obterEstadoGemini, removerChaveGemini, type EstadoGemini } from './geminiClient'

const estadoPadrao: EstadoGemini = { status: 'disconnected', message: 'Desconectado: nenhuma chave Gemini cadastrada.' }
const estiloDoEstado = {
  connected: 'bg-success',
  disconnected: 'bg-error',
  problem: 'bg-warning',
} satisfies Record<EstadoGemini['status'], string>

export function ConfiguracoesPage() {
  const { mostrarToast } = useToast()
  const montado = useRef(true)
  const [personalidade, setPersonalidadeEstado] = useState<Personalidade>('tecnica')
  const [chaveGemini, setChaveGemini] = useState('')
  const [salvandoChave, setSalvandoChave] = useState(false)
  const [removendoChave, setRemovendoChave] = useState(false)
  const [estadoGemini, setEstadoGemini] = useState<EstadoGemini>(estadoPadrao)

  async function recarregar() {
    const personalidadeAtual = await obterPersonalidade()
    if (!montado.current) return
    setPersonalidadeEstado(personalidadeAtual)
  }

  async function recarregarEstadoGemini() {
    try {
      const estado = await obterEstadoGemini()
      if (montado.current) setEstadoGemini(estado)
    } catch (falha) {
      if (!montado.current) return
      setEstadoGemini({
        status: 'problem',
        message: falha instanceof Error ? falha.message : 'Não foi possível verificar a chave Gemini.',
      })
    }
  }

  useEffect(() => {
    montado.current = true
    recarregar().catch((falha) => {
      if (!montado.current) return
      mostrarToast(falha instanceof Error ? falha.message : 'Erro ao carregar configurações.', 'erro')
    })
    const verificacaoGemini = window.setTimeout(() => {
      recarregarEstadoGemini().catch(() => undefined)
    }, 0)
    return () => {
      montado.current = false
      window.clearTimeout(verificacaoGemini)
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
      await recarregarEstadoGemini()
    } catch (falha) {
      if (!montado.current) return
      mostrarToast(falha instanceof Error ? falha.message : 'Erro ao salvar a chave Gemini.', 'erro')
    } finally {
      if (montado.current) setSalvandoChave(false)
    }
  }

  async function handleRemoverChave() {
    setRemovendoChave(true)
    try {
      await removerChaveGemini()
      if (!montado.current) return
      setChaveGemini('')
      setEstadoGemini(estadoPadrao)
      mostrarToast('Chave Gemini removida.', 'sucesso')
    } catch (falha) {
      if (!montado.current) return
      mostrarToast(falha instanceof Error ? falha.message : 'Erro ao remover a chave Gemini.', 'erro')
    } finally {
      if (montado.current) setRemovendoChave(false)
    }
  }

  const chaveCadastrada = estadoGemini.status !== 'disconnected'

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
              <p className="mt-1 text-xs text-on-surface-variant">A chave da sua conta é enviada ao servidor seguro, não fica neste navegador e usa somente os seus créditos.</p>
            </div>
            <div id="status-chave-gemini" role="status" aria-live="polite" className="flex items-center gap-2 text-xs text-on-surface-variant">
              <span aria-hidden="true" className={`h-2.5 w-2.5 shrink-0 rounded-full ${estiloDoEstado[estadoGemini.status]}`} />
              <span>{estadoGemini.message}</span>
            </div>
            <input
              id="chave-gemini"
              type="password"
              autoComplete="off"
              value={chaveGemini}
              onChange={(evento) => setChaveGemini(evento.target.value)}
              disabled={chaveCadastrada || salvandoChave || removendoChave}
              placeholder={chaveCadastrada ? 'Remova a chave cadastrada para informar outra.' : 'Cole sua chave Gemini'}
              aria-describedby="status-chave-gemini"
              className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={chaveCadastrada || salvandoChave || removendoChave}>{salvandoChave ? 'Salvando...' : 'Salvar chave Gemini'}</Button>
              {chaveCadastrada && (
                <Button type="button" variante="ghost" className="text-error hover:bg-error/10 hover:text-error" disabled={salvandoChave || removendoChave} onClick={handleRemoverChave}>
                  {removendoChave ? 'Removendo...' : 'Remover chave'}
                </Button>
              )}
            </div>
          </form>
        </Card>
      </section>
    </div>
  )
}


