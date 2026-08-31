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
          {chaveConfigurada ? (
            <p className="text-sm text-success">
              Chave configurada. A chave é definida uma única vez e não pode ser trocada por aqui.
            </p>
          ) : (
            <form onSubmit={handleSalvarChave} className="flex flex-col gap-3">
              <p className="text-sm text-on-surface-variant">
                Cole abaixo a chave de API do Gemini (gratuita). Essa chave é cifrada e só pode ser definida uma vez.
                Confira a chave com atenção antes de salvar — depois de configurada, não é possível trocar por aqui. Se errar, a única saída é limpar o app ou restaurar um backup anterior.
              </p>
              <TextField id="chave-gemini" rotulo="Chave de API do Gemini" type="password" value={chaveDigitada} onChange={(e) => setChaveDigitada(e.target.value)} />
              <Button type="submit">Salvar chave</Button>
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
