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
import type { CategoriaMaterial, TipoClassificacaoMaterial } from '../../db/schema'

const schemaCategoria = z.object({
  nome: z.string().trim().min(1, 'Informe o nome da categoria').max(120),
})

export function CategoriasMaterialPage() {
  const { mostrarToast } = useToast()
  const [categorias, setCategorias] = useState<CategoriaMaterial[]>([])
  const [nome, setNome] = useState('')
  const [tipo, setTipo] = useState<'principal' | 'subcategoria'>('principal')
  const [categoriaPaiId, setCategoriaPaiId] = useState<string>('')
  const [tipoClassificacao, setTipoClassificacao] = useState<TipoClassificacaoMaterial>('consumivel')
  const [erro, setErro] = useState<string | null>(null)
  const [categoriaEmEdicaoId, setCategoriaEmEdicaoId] = useState<number | null>(null)
  const [categoriaExcluindoId, setCategoriaExcluindoId] = useState<number | null>(null)

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
      mostrarToast(falha instanceof Error ? falha.message : 'Erro ao carregar categorias.', 'erro')
    })
    return () => {
      montado.current = false
    }
  }, [])

  function limparFormulario() {
    setNome('')
    setTipo('principal')
    setCategoriaPaiId('')
    setTipoClassificacao('consumivel')
    setCategoriaEmEdicaoId(null)
    setErro(null)
  }

  function iniciarEdicao(categoria: CategoriaMaterial) {
    setCategoriaEmEdicaoId(categoria.id ?? null)
    setNome(categoria.nome)
    setTipoClassificacao(categoria.tipoClassificacao ?? 'consumivel')
    if (categoria.categoriaPaiId) {
      setTipo('subcategoria')
      setCategoriaPaiId(String(categoria.categoriaPaiId))
    } else {
      setTipo('principal')
      setCategoriaPaiId('')
    }
    setErro(null)
  }

  function iniciarNovaSubcategoria(paiId: number) {
    limparFormulario()
    setTipo('subcategoria')
    setCategoriaPaiId(String(paiId))
  }

  async function handleSubmit(evento: React.FormEvent) {
    evento.preventDefault()
    setErro(null)

    const resultado = schemaCategoria.safeParse({ nome })
    if (!resultado.success) {
      setErro(resultado.error.issues[0]?.message ?? 'Dados inválidos')
      return
    }

    let parentIdFinal: number | undefined
    if (tipo === 'subcategoria') {
      if (!categoriaPaiId) {
        setErro('Selecione a categoria pai para esta subcategoria')
        return
      }
      parentIdFinal = Number(categoriaPaiId)
    }

    try {
      if (categoriaEmEdicaoId !== null) {
        await atualizarCategoriaMaterial(
          categoriaEmEdicaoId,
          resultado.data.nome,
          parentIdFinal,
          tipo === 'principal' ? tipoClassificacao : undefined,
        )
      } else {
        await criarCategoriaMaterial(
          resultado.data.nome,
          parentIdFinal,
          tipo === 'principal' ? tipoClassificacao : undefined,
        )
      }
    } catch (falha) {
      if (!montado.current) return
      mostrarToast(falha instanceof Error ? falha.message : 'Erro ao salvar.', 'erro')
      return
    }
    if (!montado.current) return
    mostrarToast(
      categoriaEmEdicaoId !== null
        ? 'Categoria/Subcategoria atualizada com sucesso'
        : 'Categoria/Subcategoria cadastrada com sucesso'
    )
    limparFormulario()
    await recarregar()
  }

  async function handleExcluir(categoriaId: number) {
    try {
      await excluirCategoriaMaterial(categoriaId)
    } catch (falha) {
      if (!montado.current) return
      mostrarToast(falha instanceof Error ? falha.message : 'Erro ao excluir categoria.', 'erro')
      return
    }
    if (!montado.current) return
    mostrarToast('Categoria/Subcategoria excluída com sucesso')
    setCategoriaExcluindoId(null)
    await recarregar()
  }

  const categoriasPrincipais = categorias.filter((c) => !c.categoriaPaiId)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-on-surface">Categorias & Subcategorias</h1>
        <p className="text-label-sm text-on-surface-variant">
          Organize seus insumos e materiais em categorias principais (ex: Insumo) e subcategorias (ex: Resina, Folhas).
        </p>
      </div>

      <Card>
        <h2 className="mb-3 font-medium text-on-surface">
          {categoriaEmEdicaoId !== null
            ? tipo === 'subcategoria'
              ? 'Editar Subcategoria'
              : 'Editar Categoria Principal'
            : 'Nova Categoria ou Subcategoria'}
        </h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex gap-4 border-b border-outline-variant pb-2">
            <label className="flex items-center gap-2 text-sm font-medium text-on-surface cursor-pointer">
              <input
                type="radio"
                name="tipoCategoria"
                value="principal"
                checked={tipo === 'principal'}
                onChange={() => {
                  setTipo('principal')
                  setCategoriaPaiId('')
                }}
                className="text-primary focus:ring-primary"
              />
              Categoria Principal (ex: Insumos)
            </label>
            <label className="flex items-center gap-2 text-sm font-medium text-on-surface cursor-pointer">
              <input
                type="radio"
                name="tipoCategoria"
                value="subcategoria"
                checked={tipo === 'subcategoria'}
                onChange={() => setTipo('subcategoria')}
                className="text-primary focus:ring-primary"
              />
              ↳ Subcategoria (ex: Resinas, Folhas)
            </label>
          </div>

          {tipo === 'principal' && (
            <div className="flex flex-col gap-1">
              <label htmlFor="tipo-classificacao" className="text-sm font-medium text-on-surface">
                Classificação Padrão (Divisão do Estoque)
              </label>
              <select
                id="tipo-classificacao"
                value={tipoClassificacao}
                onChange={(e) => setTipoClassificacao(e.target.value as TipoClassificacaoMaterial)}
                className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              >
                <option value="consumivel">🧪 Insumo / Consumível (Resina, silicone, enfeites...)</option>
                <option value="ferramenta">🛠️ Ferramenta / Equipamento (Estufa, incubadora, soprador...)</option>
                <option value="administrativo">📦 Administrativo / Embalagem (Papel, etiquetas, caixas...)</option>
                <option value="epi">🥽 EPI / Proteção (Luvas, máscara, touca, refil...)</option>
              </select>
            </div>
          )}

          {tipo === 'subcategoria' && (
            <div className="flex flex-col gap-1">
              <label htmlFor="categoria-pai" className="text-sm font-medium text-on-surface">
                Categoria Pai (Pertence a:)
              </label>
              <select
                id="categoria-pai"
                value={categoriaPaiId}
                onChange={(e) => setCategoriaPaiId(e.target.value)}
                className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              >
                <option value="">Selecione a categoria pai...</option>
                {categoriasPrincipais.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </div>
          )}

          <TextField
            id="nome-categoria"
            rotulo={tipo === 'subcategoria' ? 'Nome da subcategoria' : 'Nome da categoria principal'}
            placeholder={tipo === 'subcategoria' ? 'Ex: Resinas, Folhas, Pigmentos' : 'Ex: Insumos, Embalagens'}
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />

          {erro && (
            <p role="alert" className="text-sm text-error">
              {erro}
            </p>
          )}
          <div className="flex gap-2">
            <Button type="submit" disabled={!nome.trim()}>
              {categoriaEmEdicaoId !== null ? 'Salvar' : tipo === 'subcategoria' ? 'Cadastrar Subcategoria' : 'Cadastrar Categoria'}
            </Button>
            {categoriaEmEdicaoId !== null && (
              <Button type="button" variante="ghost" onClick={limparFormulario}>
                Cancelar edição
              </Button>
            )}
          </div>
        </form>
      </Card>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-on-surface">Estrutura de Categorias Cadastradas</h2>
        {categoriasPrincipais.length === 0 ? (
          <EmptyState titulo="Nenhuma categoria cadastrada" descricao="Cadastre a primeira categoria de material." />
        ) : (
          <ul className="flex flex-col gap-3">
            {categoriasPrincipais.map((catPai) => {
              const subcats = categorias.filter((c) => c.categoriaPaiId === catPai.id)
              return (
                <Card key={catPai.id} className="glow-hover flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-2 border-b border-outline-variant/40 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-base">📁</span>
                      <h3 className="font-semibold text-on-surface text-base">{catPai.nome}</h3>
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary font-medium">
                        {subcats.length} subcategoria{subcats.length === 1 ? '' : 's'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variante="ghost" onClick={() => catPai.id && iniciarNovaSubcategoria(catPai.id)}>
                        + Add Subcategoria
                      </Button>
                      <Button variante="ghost" onClick={() => iniciarEdicao(catPai)}>
                        Editar
                      </Button>
                      <Button variante="ghost" onClick={() => setCategoriaExcluindoId(catPai.id ?? null)}>
                        Excluir
                      </Button>
                    </div>
                  </div>

                  {subcats.length === 0 ? (
                    <p className="text-xs text-on-surface-variant italic pl-6">
                      Nenhuma subcategoria nesta categoria principal.
                    </p>
                  ) : (
                    <ul className="pl-6 flex flex-col gap-1.5">
                      {subcats.map((sub) => (
                        <li
                          key={sub.id}
                          className="flex items-center justify-between gap-2 rounded-lg bg-surface-container/60 p-2 border border-outline-variant/30 hover:bg-surface-container transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-on-surface-variant text-sm">↳</span>
                            <span className="text-sm font-medium text-on-surface">{sub.nome}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button variante="ghost" onClick={() => iniciarEdicao(sub)}>
                              Editar
                            </Button>
                            <Button variante="ghost" onClick={() => setCategoriaExcluindoId(sub.id ?? null)}>
                              Excluir
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              )
            })}
          </ul>
        )}
      </section>

      <ConfirmModal
        aberto={categoriaExcluindoId !== null}
        titulo="Excluir categoria ou subcategoria?"
        descricao="Categorias ou subcategorias com materiais vinculados não podem ser excluídas."
        onConfirmar={() => categoriaExcluindoId !== null && handleExcluir(categoriaExcluindoId)}
        onCancelar={() => setCategoriaExcluindoId(null)}
      />
    </div>
  )
}
