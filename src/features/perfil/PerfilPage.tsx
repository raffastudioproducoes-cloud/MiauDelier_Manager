import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { TextField } from '../../components/ui/TextField'
import { Badge } from '../../components/ui/Badge'
import { ConfirmModal } from '../../components/ui/ConfirmModal'
import { useToast } from '../../components/ui/useToast'
import { db } from '../../db/schema'
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

export function PerfilPage() {
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
      if (perfilExcluindoId === RESERVED_DEFAULT_PROFILE_ID) {
        atualizarPerfil(RESERVED_DEFAULT_PROFILE_ID, {
          nome: 'Ateliê Principal',
          nomeDono: '',
          emailDono: '',
          endereco: '',
          documento: '',
          telefone: '',
        })
        try {
          await db.delete()
          await db.open()
        } catch (err) {
          console.error('Erro ao limpar banco de dados principal:', err)
        }
        mostrarToast('Perfil principal restaurado e dados apagados com sucesso.', 'sucesso')
        setPerfilExcluindoId(null)
        if (exibindoFormulario) handleCancelarForm()
        setTimeout(() => window.location.reload(), 400)
        return
      }

      const eraAtivo = perfilExcluindoId === perfilAtivo.id
      await excluirPerfil(perfilExcluindoId)
      mostrarToast('Perfil de ateliê e dados isolados excluídos com sucesso.', 'sucesso')
      setPerfilExcluindoId(null)
      if (exibindoFormulario && perfilEmEdicaoId === perfilExcluindoId) {
        handleCancelarForm()
      }
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

  const perfilSendoExcluido = perfis.find((p) => p.id === perfilExcluindoId)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-on-surface">Gestão de Perfis de Ateliê</h1>
          <p className="text-label-sm text-on-surface-variant">
            Gerencie e alterne entre seus ateliês. Cada perfil possui banco de dados 100% isolado (estoque, peças, vendas e clientes).
          </p>
        </div>
        {!exibindoFormulario && (
          <Button type="button" onClick={handleNovoPerfil}>
            + Novo Ateliê
          </Button>
        )}
      </div>

      {/* Card de Destaque do Perfil Ativo */}
      <Card className="border-2 border-primary/40 bg-primary/5 p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🏢</span>
            <div>
              <h2 className="text-base font-bold text-on-surface">{perfilAtivo.nome}</h2>
              <p className="text-xs text-on-surface-variant">Perfil Atualmente em Uso</p>
            </div>
          </div>
          <Badge variant="success">✓ Ativo Agora</Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-on-surface pt-2 border-t border-primary/20">
          <div>
            👤 <strong>Dono:</strong> {perfilAtivo.nomeDono || 'Não informado'}
          </div>
          <div>
            📄 <strong>CPF/CNPJ:</strong> {perfilAtivo.documento || 'Não informado'}
          </div>
          <div>
            📞 <strong>Contato:</strong> {perfilAtivo.telefone || perfilAtivo.emailDono || 'Não informado'}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-primary/20">
          <Button
            type="button"
            variante="ghost"
            className="text-xs"
            onClick={() => handleEditarPerfil(perfilAtivo)}
          >
            ✏️ Editar Perfil
          </Button>
          <Button
            type="button"
            variante="ghost"
            className="text-xs text-error hover:bg-error/10"
            onClick={() => setPerfilExcluindoId(perfilAtivo.id)}
          >
            🗑️ Excluir Perfil
          </Button>
        </div>
      </Card>

      {/* Formulário de Criação/Edição */}
      {exibindoFormulario && (
        <Card className="border border-primary/40 bg-surface p-4">
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

            <div className="flex items-center justify-between mt-2">
              {perfilEmEdicaoId ? (
                <Button
                  type="button"
                  variante="ghost"
                  className="text-error hover:bg-error/10 text-xs"
                  onClick={() => setPerfilExcluindoId(perfilEmEdicaoId)}
                >
                  🗑️ Excluir este perfil
                </Button>
              ) : (
                <div />
              )}
              <div className="flex gap-2">
                <Button type="button" variante="ghost" onClick={handleCancelarForm}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {perfilEmEdicaoId ? 'Salvar Alterações' : 'Cadastrar Ateliê'}
                </Button>
              </div>
            </div>
          </form>
        </Card>
      )}

      {/* Lista de Todos os Perfis */}
      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-on-surface-variant">Todos os Perfis Cadastrados</h2>
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
                    <Button
                      type="button"
                      variante="ghost"
                      className="px-3 py-1 text-xs text-error hover:bg-error/10"
                      onClick={() => setPerfilExcluindoId(p.id)}
                    >
                      Excluir
                    </Button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      </div>

      <ConfirmModal
        aberto={perfilExcluindoId !== null}
        titulo={
          perfilExcluindoId === RESERVED_DEFAULT_PROFILE_ID
            ? 'Limpar e Restaurar Perfil Principal?'
            : 'Excluir Perfil de Ateliê?'
        }
        descricao={
          perfilExcluindoId === RESERVED_DEFAULT_PROFILE_ID
            ? 'Como este é o perfil principal do sistema, esta ação irá apagar todos os dados cadastrados (estoque, peças, vendas e clientes) e resetar os dados do ateliê para o padrão inicial. Deseja continuar?'
            : `Esta ação excluirá o perfil "${perfilSendoExcluido?.nome || 'selecionado'}" e todo o seu banco de dados isolado (estoque, faturas, peças, clientes). Esta ação não pode ser desfeita.`
        }
        onConfirmar={handleConfirmarExclusao}
        onCancelar={() => setPerfilExcluindoId(null)}
      />
    </div>
  )
}
