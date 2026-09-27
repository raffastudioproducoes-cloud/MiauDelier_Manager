import { useEffect, useRef, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { TextField } from '../../components/ui/TextField'
import { Badge } from '../../components/ui/Badge'
import { ConfirmModal } from '../../components/ui/ConfirmModal'
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
  atualizarPerfil,
  excluirPerfil,
  selecionarPerfil,
  RESERVED_DEFAULT_PROFILE_ID,
  type PerfilAtelie,
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

      <SeccaoTarifasConfig />

      <SeccaoPerfisAtelie />
    </div>
  )
}

function SeccaoTarifasConfig() {
  const { mostrarToast } = useToast()
  const [valorHora, setValorHora] = useState('25.00')
  const [tarifaKwh, setTarifaKwh] = useState('0.85')
  const [tarifaAguaM3, setTarifaAguaM3] = useState('15.00')
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    import('../pricing/tarifasConfigRepo').then(({ obterTarifasConfig }) => {
      obterTarifasConfig().then((t) => {
        setValorHora(String(t.valorHoraMaoDeObra))
        setTarifaKwh(String(t.tarifaKwh))
        setTarifaAguaM3(String(t.tarifaAguaM3))
      })
    })
  }, [])

  async function handleSalvarTarifas(e: React.FormEvent) {
    e.preventDefault()
    setSalvando(true)
    try {
      const { salvarTarifasConfig } = await import('../pricing/tarifasConfigRepo')
      await salvarTarifasConfig({
        valorHoraMaoDeObra: Number(valorHora) || 0,
        tarifaKwh: Number(tarifaKwh) || 0,
        tarifaAguaM3: Number(tarifaAguaM3) || 0,
      })
      mostrarToast('Tarifas padrões do ateliê salvas com sucesso!', 'sucesso')
    } catch (err) {
      mostrarToast(err instanceof Error ? err.message : 'Erro ao salvar tarifas.', 'erro')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold text-on-surface-variant">
        Tarifas de Custo Padrão do Ateliê (Mão de Obra, Luz & Água)
      </h2>
      <Card>
        <form onSubmit={handleSalvarTarifas} className="flex flex-col gap-3">
          <p className="text-xs text-on-surface-variant">
            Estes valores são usados automaticamente no cálculo da página de Precificação.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <TextField
              id="config-valor-hora"
              rotulo="Valor da Mão de Obra (R$ / Hora)"
              type="number"
              step="0.01"
              value={valorHora}
              onChange={(e) => setValorHora(e.target.value)}
            />
            <TextField
              id="config-tarifa-kwh"
              rotulo="Tarifa de Luz (R$ / kWh)"
              type="number"
              step="0.01"
              value={tarifaKwh}
              onChange={(e) => setTarifaKwh(e.target.value)}
            />
            <TextField
              id="config-tarifa-agua-m3"
              rotulo="Tarifa de Água (R$ / m³)"
              type="number"
              step="0.01"
              value={tarifaAguaM3}
              onChange={(e) => setTarifaAguaM3(e.target.value)}
            />
          </div>
          <div className="flex justify-end mt-1">
            <Button type="submit" disabled={salvando}>
              Salvar Tarifas
            </Button>
          </div>
        </form>
      </Card>
    </section>
  )
}

function SeccaoPerfisAtelie() {
  const { mostrarToast } = useToast()
  const [perfis, setPerfis] = useState(listarPerfis())
  const [perfilAtivo, setPerfilAtivoEstado] = useState(getPerfilAtivo())

  // Formulário de perfil
  const [exibindoFormulario, setExibindoFormulario] = useState(false)
  const [perfilEmEdicaoId, setPerfilEmEdicaoId] = useState<string | null>(null)
  const [nomeAtelier, setNomeAtelier] = useState('')
  const [nomeDono, setNomeDono] = useState('')
  const [emailDono, setEmailDono] = useState('')
  const [endereco, setEndereco] = useState('')
  const [documento, setDocumento] = useState('')
  const [telefone, setTelefone] = useState('')
  const [erroForm, setErroForm] = useState<string | null>(null)

  // Exclusão
  const [perfilExcluindoId, setPerfilExcluindoId] = useState<string | null>(null)

  function recarregarPerfis() {
    const lista = listarPerfis()
    setPerfis(lista)
    setPerfilAtivoEstado(getPerfilAtivo())
  }

  function handleTrocarPerfil(id: string) {
    if (id === perfilAtivo.id) return
    selecionarPerfil(id)
    mostrarToast('Ateliê ativo alterado! Carregando dados isolados...', 'sucesso')
    setTimeout(() => {
      window.location.reload()
    }, 400)
  }

  function handleNovoPerfil() {
    setPerfilEmEdicaoId(null)
    setNomeAtelier('')
    setNomeDono('')
    setEmailDono('')
    setEndereco('')
    setDocumento('')
    setTelefone('')
    setErroForm(null)
    setExibindoFormulario(true)
  }

  function handleEditarPerfil(perfil: PerfilAtelie) {
    setPerfilEmEdicaoId(perfil.id)
    setNomeAtelier(perfil.nome)
    setNomeDono(perfil.nomeDono || '')
    setEmailDono(perfil.emailDono || '')
    setEndereco(perfil.endereco || '')
    setDocumento(perfil.documento || '')
    setTelefone(perfil.telefone || '')
    setErroForm(null)
    setExibindoFormulario(true)
  }

  function handleCancelarForm() {
    setExibindoFormulario(false)
    setPerfilEmEdicaoId(null)
    setErroForm(null)
  }

  function handleSalvarPerfil(e: React.FormEvent) {
    e.preventDefault()
    setErroForm(null)

    if (!nomeAtelier.trim()) {
      setErroForm('Informe o nome do ateliê.')
      return
    }

    try {
      if (perfilEmEdicaoId) {
        atualizarPerfil(perfilEmEdicaoId, {
          nome: nomeAtelier,
          nomeDono,
          emailDono,
          endereco,
          documento,
          telefone,
        })
        mostrarToast(`Ateliê "${nomeAtelier.trim()}" atualizado com sucesso!`, 'sucesso')
      } else {
        const novo = criarPerfil({
          nome: nomeAtelier,
          nomeDono,
          emailDono,
          endereco,
          documento,
          telefone,
        })
        mostrarToast(`Novo ateliê "${novo.nome}" cadastrado com sucesso!`, 'sucesso')
      }
      recarregarPerfis()
      setExibindoFormulario(false)
      setPerfilEmEdicaoId(null)
    } catch (err) {
      setErroForm(err instanceof Error ? err.message : 'Erro ao salvar perfil de ateliê.')
    }
  }

  async function handleConfirmarExclusao() {
    if (!perfilExcluindoId) return
    try {
      const eraAtivo = perfilExcluindoId === perfilAtivo.id
      await excluirPerfil(perfilExcluindoId)
      mostrarToast('Perfil de ateliê e dados isolados excluídos com sucesso.', 'sucesso')
      setPerfilExcluindoId(null)
      if (eraAtivo) {
        setTimeout(() => window.location.reload(), 400)
      } else {
        recarregarPerfis()
      }
    } catch (err) {
      mostrarToast(err instanceof Error ? err.message : 'Erro ao excluir perfil.', 'erro')
      setPerfilExcluindoId(null)
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-on-surface-variant">Perfis de Ateliê (Gestão Multiperfil Isolada)</h2>
          <p className="text-xs text-on-surface-variant">
            Cada perfil possui banco de dados 100% separado para estoque, faturas, peças, vendas e clientes.
          </p>
        </div>
        {!exibindoFormulario && (
          <Button type="button" onClick={handleNovoPerfil}>
            + Novo Ateliê
          </Button>
        )}
      </div>

      {exibindoFormulario && (
        <Card className="border border-primary/30 bg-primary/5">
          <h3 className="font-semibold text-on-surface mb-3">
            {perfilEmEdicaoId ? 'Editar Perfil do Ateliê' : 'Cadastrar Novo Perfil de Ateliê'}
          </h3>
          <form onSubmit={handleSalvarPerfil} className="flex flex-col gap-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <TextField
                id="perfil-nome-atelier"
                rotulo="Nome do Ateliê *"
                value={nomeAtelier}
                onChange={(e) => setNomeAtelier(e.target.value)}
                placeholder="Ex: Ateliê MiauDelier Resinas"
              />
              <TextField
                id="perfil-nome-dono"
                rotulo="Nome do Dono"
                value={nomeDono}
                onChange={(e) => setNomeDono(e.target.value)}
                placeholder="Ex: Rafaela Silva"
              />
              <TextField
                id="perfil-email-dono"
                rotulo="E-mail do Dono"
                type="email"
                value={emailDono}
                onChange={(e) => setEmailDono(e.target.value)}
                placeholder="Ex: contato@atelie.com"
              />
              <TextField
                id="perfil-documento"
                rotulo="CNPJ ou CPF"
                value={documento}
                onChange={(e) => setDocumento(e.target.value)}
                placeholder="Ex: 00.000.000/0001-00 ou 000.000.000-00"
              />
              <TextField
                id="perfil-telefone"
                rotulo="Telefone / WhatsApp"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="Ex: (11) 99999-8888"
              />
              <TextField
                id="perfil-endereco"
                rotulo="Endereço Completo"
                value={endereco}
                onChange={(e) => setEndereco(e.target.value)}
                placeholder="Ex: Av. Paulista, 1000 - São Paulo / SP"
              />
            </div>

            {erroForm && <p role="alert" className="text-xs text-error font-medium">{erroForm}</p>}

            <div className="flex gap-2 justify-end mt-2">
              <Button type="button" variante="ghost" onClick={handleCancelarForm}>
                Cancelar
              </Button>
              <Button type="submit">
                {perfilEmEdicaoId ? 'Salvar Alterações' : 'Cadastrar Ateliê'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {perfis.map((p) => {
          const ehAtivo = p.id === perfilAtivo.id
          const ehPadrao = p.id === RESERVED_DEFAULT_PROFILE_ID

          return (
            <Card key={p.id} className={`flex flex-col justify-between gap-3 ${ehAtivo ? 'border-2 border-primary glow-hover' : ''}`}>
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-bold text-on-surface flex items-center gap-2">
                    🏢 {p.nome}
                  </h3>
                  <div className="flex items-center gap-1">
                    {ehAtivo && <Badge variant="success">✓ Ativo</Badge>}
                    {ehPadrao && <Badge variant="neutral">Principal</Badge>}
                  </div>
                </div>

                <div className="text-xs text-on-surface-variant flex flex-col gap-1 mt-1">
                  {p.nomeDono && (
                    <p>👤 <strong>Dono:</strong> {p.nomeDono} {p.emailDono ? `(${p.emailDono})` : ''}</p>
                  )}
                  {!p.nomeDono && p.emailDono && (
                    <p>✉️ <strong>E-mail:</strong> {p.emailDono}</p>
                  )}
                  {p.documento && (
                    <p>📄 <strong>CPF/CNPJ:</strong> {p.documento}</p>
                  )}
                  {p.telefone && (
                    <p>📞 <strong>Telefone:</strong> {p.telefone}</p>
                  )}
                  {p.endereco && (
                    <p>📍 <strong>Endereço:</strong> {p.endereco}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-outline-variant/50 gap-2">
                <div>
                  {!ehAtivo && (
                    <Button type="button" className="px-3 py-1 text-xs" onClick={() => handleTrocarPerfil(p.id)}>
                      Alternar para este perfil
                    </Button>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button type="button" variante="ghost" className="px-3 py-1 text-xs" onClick={() => handleEditarPerfil(p)}>
                    Editar
                  </Button>
                  {!ehPadrao && (
                    <Button
                      type="button"
                      variante="ghost"
                      className="px-3 py-1 text-xs text-error hover:bg-error/10"
                      onClick={() => setPerfilExcluindoId(p.id)}
                    >
                      Excluir
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      <ConfirmModal
        aberto={perfilExcluindoId !== null}
        titulo="Excluir Perfil de Ateliê?"
        descricao="Esta ação excluirá o perfil e todo o seu banco de dados isolado (estoque, faturas, peças, clientes). Esta ação não pode ser desfeita."
        onConfirmar={handleConfirmarExclusao}
        onCancelar={() => setPerfilExcluindoId(null)}
      />
    </section>
  )
}
