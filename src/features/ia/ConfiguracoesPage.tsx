import { useEffect, useRef, useState } from 'react'
import { Card } from '../../components/ui/Card'
import { useToast } from '../../components/ui/useToast'
import {
  definirPersonalidade,
  obterPersonalidade,
  type Personalidade,
} from './iaConfigRepo'


export function ConfiguracoesPage() {
  const { mostrarToast } = useToast()
  const montado = useRef(true)
  const [personalidade, setPersonalidadeEstado] = useState<Personalidade>('tecnica')

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
      </section>
    </div>
  )
}


