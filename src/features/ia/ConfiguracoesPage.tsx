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
import {
  listarPerfis,
  getPerfilAtivo,
  criarPerfil,
  selecionarPerfil,
} from '../../lib/perfisRepo'


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

      <SeccaoPerfisAtelie />
    </div>
  )
}

function SeccaoPerfisAtelie() {
  const { mostrarToast } = useToast()
  const [perfis, setPerfis] = useState(listarPerfis())
  const [perfilAtivo, setPerfilAtivoEstado] = useState(getPerfilAtivo())
  const [novoNome, setNovoNome] = useState('')

  function handleTrocarPerfil(id: string) {
    selecionarPerfil(id)
    setPerfilAtivoEstado(getPerfilAtivo())
    mostrarToast('Perfil de ateliê alterado com sucesso!')
  }

  function handleCriarPerfil(e: React.FormEvent) {
    e.preventDefault()
    if (!novoNome.trim()) return
    const novo = criarPerfil(novoNome.trim())
    setNovoNome('')
    setPerfis(listarPerfis())
    selecionarPerfil(novo.id)
    setPerfilAtivoEstado(novo)
    mostrarToast(`Ateliê "${novo.nome}" criado e selecionado!`)
  }

  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold text-on-surface-variant">Perfis de Ateliê (Multiperfis Isolados)</h2>
      <Card className="flex flex-col gap-4">
        <div>
          <label htmlFor="perfil-ativo-select" className="text-sm font-medium text-on-surface">Ateliê Ativo</label>
          <select
            id="perfil-ativo-select"
            value={perfilAtivo.id}
            onChange={(e) => handleTrocarPerfil(e.target.value)}
            className="mt-1 w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
          >
            {perfis.map((p) => (
              <option key={p.id} value={p.id}>{p.nome}</option>
            ))}
          </select>
        </div>

        <form onSubmit={handleCriarPerfil} className="flex flex-col gap-2 pt-2 border-t border-outline-variant">
          <p className="text-xs text-on-surface-variant">Criar novo perfil isolado para gerenciar outro ateliê:</p>
          <div className="flex gap-2">
            <TextField
              id="novo-nome-perfil"
              rotulo="Nome do Ateliê"
              value={novoNome}
              onChange={(e) => setNovoNome(e.target.value)}
            />
            <Button type="submit" className="self-end">Criar</Button>
          </div>
        </form>
      </Card>
    </section>
  )
}

