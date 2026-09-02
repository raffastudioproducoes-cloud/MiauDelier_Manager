import { useEffect, useRef, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { TextField } from '../../components/ui/TextField'
import { useToast } from '../../components/ui/useToast'
import {
  hasChaveConfigurada,
  definirChaveGemini,
  definirPersonalidade,
  obterPersonalidade,
  type Personalidade,
} from './iaConfigRepo'

export function ConfiguracoesPage() {
  const { mostrarToast } = useToast()
  const montado = useRef(true)
  const [chaveConfigurada, setChaveConfigurada] = useState<boolean | null>(null)
  const [personalidade, setPersonalidadeEstado] = useState<Personalidade>('tecnica')
  const [chaveDigitada, setChaveDigitada] = useState('')
  const [editandoChave, setEditandoChave] = useState(false)

  async function recarregar() {
    const [configurada, personalidadeAtual] = await Promise.all([hasChaveConfigurada(), obterPersonalidade()])
    if (!montado.current) return
    setChaveConfigurada(configurada)
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
  }, [])

  async function handleSalvarChave(evento: React.FormEvent) {
    evento.preventDefault()
    if (!chaveDigitada.trim()) return

    try {
      await definirChaveGemini(chaveDigitada.trim())
      if (!montado.current) return
      mostrarToast('Chave salva com sucesso')
      setChaveDigitada('')
      setEditandoChave(false)
      await recarregar()
    } catch (falha) {
      if (!montado.current) return
      mostrarToast(falha instanceof Error ? falha.message : 'Erro ao salvar a chave.', 'erro')
    }
  }

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

  if (chaveConfigurada === null) return <p className="text-on-surface-variant">Carregando...</p>

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-on-surface">Configurações</h1>
        <p className="text-label-sm text-on-surface-variant">Assistente de IA e preferências do ateliê.</p>
      </div>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-on-surface-variant">Chave de API do Gemini</h2>
        <Card>
          {chaveConfigurada && !editandoChave ? (
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-success">Chave configurada.</p>
              <Button variante="ghost" onClick={() => setEditandoChave(true)}>Editar</Button>
            </div>
          ) : (
            <form onSubmit={handleSalvarChave} className="flex flex-col gap-3">
              <p className="text-sm text-on-surface-variant">
                Cole abaixo a chave de API do Gemini (gratuita). Ela é cifrada antes de ser salva.
              </p>
              <TextField id="chave-gemini" rotulo="Chave de API do Gemini" type="password" value={chaveDigitada} onChange={(e) => setChaveDigitada(e.target.value)} />
              <div className="flex gap-2">
                <Button type="submit">Salvar chave</Button>
                {chaveConfigurada && (
                  <Button
                    type="button"
                    variante="ghost"
                    onClick={() => {
                      setEditandoChave(false)
                      setChaveDigitada('')
                    }}
                  >
                    Cancelar
                  </Button>
                )}
              </div>
            </form>
          )}
        </Card>
      </section>

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
      </section>
    </div>
  )
}
