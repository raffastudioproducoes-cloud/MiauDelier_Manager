import { useEffect, useRef, useState } from 'react'
import { z } from 'zod'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { TextField } from '../../components/ui/TextField'
import { EmptyState } from '../../components/ui/EmptyState'
import { ConfirmModal } from '../../components/ui/ConfirmModal'
import { useToast } from '../../components/ui/useToast'
import {
  criarCategoriaMaterial,
  listarCategoriasMaterial,
  atualizarCategoriaMaterial,
  excluirCategoriaMaterial,
} from './categoriasMaterialRepo'
import type { CategoriaMaterial } from '../../db/schema'

// Divisões Padrão do Sistema (FIXAS — nunca editáveis/excluíveis)
const DIVISOES_PADRAO_FIXAS = [
  { id: 'consumivel', nome: 'Insumos / Consumíveis', icone: '🧪', desc: 'Resinas, silicones, pigmentos, enfeites' },
  { id: 'ferramenta', nome: 'Ferramentas & Equipamentos', icone: '🛠️', desc: 'Estufas, incubadoras, sopradores, politrizes' },
  { id: 'administrativo', nome: 'Administrativo & Embalagens', icone: '📦', desc: 'Papel, etiquetas, caixas, fitas' },
  { id: 'epi', nome: 'EPIs & Proteção', icone: '🥽', desc: 'Luvas, máscaras, toucas, refis' },
]

const NOMES_PADRAO_FIXOS = new Set(DIVISOES_PADRAO_FIXAS.map((d) => d.nome.toLowerCase()))
const MAX_DIVISOES_CUSTOM = 10

const schemaDivisao = z.object({
  nome: z.string().trim().min(1, 'Informe o nome da divisão').max(120),
})

export function CategoriasMaterialPage() {
  const { mostrarToast } = useToast()
  const [categorias, setCategorias] = useState<CategoriaMaterial[]>([])
  const [nome, setNome] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [divisaoEmEdicaoId, setDivisaoEmEdicaoId] = useState<number | null>(null)
  const [divisaoExcluindoId, setDivisaoExcluindoId] = useState<number | null>(null)

  const montado = useRef(true)

  async function recarregar() {
    const categoriasCarregadas = await listarCategoriasMaterial()
    if (!montado.current) return
    setCategorias(categoriasCarregadas)
  }

  useEffect(() => {
    montado.current = true
    recarregar().catch((falha) => {
      if (!montado.current) return
      mostrarToast(falha instanceof Error ? falha.message : 'Erro ao carregar divisões.', 'erro')
    })
    return () => {
      montado.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function limparFormulario() {
    setNome('')
    setDivisaoEmEdicaoId(null)
    setErro(null)
  }

  function iniciarEdicao(categoria: CategoriaMaterial) {
    setDivisaoEmEdicaoId(categoria.id ?? null)
    setNome(categoria.nome)
    setErro(null)
  }

  // Divisões customizadas = categorias sem pai e cujo nome NÃO é das padrão fixas
  const divisoesCustom = categorias.filter(
    (c) => !c.categoriaPaiId && c.nome !== 'Geral' && !NOMES_PADRAO_FIXOS.has(c.nome.toLowerCase()),
  )

  async function handleSubmit(evento: React.FormEvent) {
    evento.preventDefault()
    setErro(null)

    const resultado = schemaDivisao.safeParse({ nome })
    if (!resultado.success) {
      setErro(resultado.error.issues[0]?.message ?? 'Dados inválidos')
      return
    }

    const nomeNorm = resultado.data.nome.toLowerCase()

    if (NOMES_PADRAO_FIXOS.has(nomeNorm)) {
      setErro('Este nome já pertence a uma divisão padrão do sistema.')
      return
    }

    if (divisaoEmEdicaoId === null && divisoesCustom.length >= MAX_DIVISOES_CUSTOM) {
      setErro(`Limite atingido: máximo de ${MAX_DIVISOES_CUSTOM} divisões personalizadas.`)
      return
    }

    const nomeDuplicado = divisoesCustom.some(
      (d) => d.nome.toLowerCase() === nomeNorm && d.id !== divisaoEmEdicaoId,
    )
    if (nomeDuplicado) {
      setErro('Já existe uma divisão personalizada com este nome.')
      return
    }

    try {
      if (divisaoEmEdicaoId !== null) {
        await atualizarCategoriaMaterial(divisaoEmEdicaoId, resultado.data.nome, undefined, undefined)
      } else {
        await criarCategoriaMaterial(resultado.data.nome, undefined, undefined)
      }
    } catch (falha) {
      if (!montado.current) return
      mostrarToast(falha instanceof Error ? falha.message : 'Erro ao salvar.', 'erro')
      return
    }
    if (!montado.current) return
    mostrarToast(divisaoEmEdicaoId !== null ? 'Divisão atualizada com sucesso' : 'Divisão criada com sucesso')
    limparFormulario()
    await recarregar()
  }

  async function handleExcluir(categoriaId: number) {
    try {
      await excluirCategoriaMaterial(categoriaId)
    } catch (falha) {
      if (!montado.current) return
      mostrarToast(falha instanceof Error ? falha.message : 'Erro ao excluir divisão.', 'erro')
      return
    }
    if (!montado.current) return
    mostrarToast('Divisão excluída com sucesso')
    setDivisaoExcluindoId(null)
    await recarregar()
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-on-surface">Divisões do Estoque</h1>
        <p className="text-label-sm text-on-surface-variant">
          As 4 divisões padrão do sistema são fixas e não podem ser alteradas. Você pode criar até{' '}
          {MAX_DIVISOES_CUSTOM} divisões personalizadas adicionais.
        </p>
      </div>

      {/* Divisões Padrão (somente leitura) */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-on-surface flex items-center gap-2">
          🔒 Divisões Padrão do Sistema
          <span className="text-xs font-normal text-on-surface-variant">(fixas — não podem ser editadas)</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {DIVISOES_PADRAO_FIXAS.map((div) => (
            <Card key={div.id} className="flex items-start gap-3 opacity-80 select-none cursor-default">
              <span className="text-2xl mt-0.5">{div.icone}</span>
              <div>
                <p className="text-sm font-semibold text-on-surface">{div.nome}</p>
                {div.desc && <p className="text-xs text-on-surface-variant mt-0.5">{div.desc}</p>}
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Criar nova divisão personalizada */}
      <Card>
        <h2 className="mb-1 font-medium text-on-surface">
          {divisaoEmEdicaoId !== null ? '✏️ Editar Divisão Personalizada' : '➕ Nova Divisão Personalizada'}
        </h2>
        <p className="text-xs text-on-surface-variant mb-3">
          {divisoesCustom.length}/{MAX_DIVISOES_CUSTOM} divisões personalizadas criadas.
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <TextField
            id="nome-divisao-custom"
            rotulo="Nome da nova divisão"
            placeholder="Ex: Resinas Premium, Pigmentos Especiais, Embalagens Ecológicas..."
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />
          {erro && (
            <p role="alert" className="text-sm text-error">
              {erro}
            </p>
          )}
          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={!nome.trim() || (divisaoEmEdicaoId === null && divisoesCustom.length >= MAX_DIVISOES_CUSTOM)}
            >
              {divisaoEmEdicaoId !== null ? 'Salvar alterações' : 'Criar Divisão'}
            </Button>
            {divisaoEmEdicaoId !== null && (
              <Button type="button" variante="ghost" onClick={limparFormulario}>
                Cancelar edição
              </Button>
            )}
          </div>
        </form>
      </Card>

      {/* Lista de divisões personalizadas */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-on-surface">
          ✏️ Divisões Personalizadas ({divisoesCustom.length}/{MAX_DIVISOES_CUSTOM})
        </h2>
        {divisoesCustom.length === 0 ? (
          <EmptyState
            titulo="Nenhuma divisão personalizada criada"
            descricao="Crie divisões personalizadas acima para organizar melhor o seu estoque."
          />
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {divisoesCustom.map((div) => (
              <Card key={div.id} className="glow-hover flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2 border-b border-outline-variant/40 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-base">📁</span>
                    <h3 className="font-semibold text-on-surface text-base">{div.nome}</h3>
                  </div>
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                    CUSTOM
                  </span>
                </div>
                <div className="flex items-center justify-end gap-1 mt-auto">
                  <Button variante="ghost" className="text-xs" onClick={() => iniciarEdicao(div)}>
                    Editar
                  </Button>
                  <Button
                    variante="ghost"
                    className="text-xs text-error hover:bg-error/10"
                    onClick={() => setDivisaoExcluindoId(div.id ?? null)}
                  >
                    Excluir
                  </Button>
                </div>
              </Card>
            ))}
          </ul>
        )}
      </section>

      <ConfirmModal
        aberto={divisaoExcluindoId !== null}
        titulo="Excluir divisão personalizada?"
        descricao="Divisões com materiais vinculados não podem ser excluídas. Mova os materiais antes de excluir."
        onConfirmar={() => divisaoExcluindoId !== null && handleExcluir(divisaoExcluindoId)}
        onCancelar={() => setDivisaoExcluindoId(null)}
      />
    </div>
  )
}
