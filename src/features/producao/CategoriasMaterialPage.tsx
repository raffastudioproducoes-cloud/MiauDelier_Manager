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

const schemaCategoria = z.object({
  nome: z.string().trim().min(1, 'Informe o nome da categoria').max(120),
})

export function CategoriasMaterialPage() {
  const { mostrarToast } = useToast()
  const [categorias, setCategorias] = useState<CategoriaMaterial[]>([])
  const [nome, setNome] = useState('')
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
    setCategoriaEmEdicaoId(null)
    setErro(null)
  }

  function iniciarEdicao(categoria: CategoriaMaterial) {
    setCategoriaEmEdicaoId(categoria.id ?? null)
    setNome(categoria.nome)
    setErro(null)
  }

  async function handleSubmit(evento: React.FormEvent) {
    evento.preventDefault()
    setErro(null)

    const resultado = schemaCategoria.safeParse({ nome })
    if (!resultado.success) {
      setErro(resultado.error.issues[0]?.message ?? 'Dados inválidos')
      return
    }

    try {
      if (categoriaEmEdicaoId !== null) {
        await atualizarCategoriaMaterial(categoriaEmEdicaoId, resultado.data.nome)
      } else {
        await criarCategoriaMaterial(resultado.data.nome)
      }
    } catch (falha) {
      if (!montado.current) return
      mostrarToast(falha instanceof Error ? falha.message : 'Erro ao salvar.', 'erro')
      return
    }
    if (!montado.current) return
    mostrarToast(categoriaEmEdicaoId !== null ? 'Categoria atualizada com sucesso' : 'Categoria cadastrada com sucesso')
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
    mostrarToast('Categoria excluída com sucesso')
    setCategoriaExcluindoId(null)
    await recarregar()
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-on-surface">Categorias</h1>
        <p className="text-label-sm text-on-surface-variant">Categorias usadas para organizar os materiais.</p>
      </div>

      <Card>
        <h2 className="mb-3 font-medium text-on-surface">
          {categoriaEmEdicaoId !== null ? 'Editar categoria' : 'Cadastrar categoria'}
        </h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <TextField id="nome-categoria" rotulo="Nome da categoria" value={nome} onChange={(e) => setNome(e.target.value)} />

          {erro && <p role="alert" className="text-sm text-error">{erro}</p>}
          <div className="flex gap-2">
            <Button type="submit" disabled={!nome.trim()}>
              {categoriaEmEdicaoId !== null ? 'Salvar' : 'Cadastrar categoria'}
            </Button>
            {categoriaEmEdicaoId !== null && (
              <Button type="button" variante="ghost" onClick={limparFormulario}>Cancelar edição</Button>
            )}
          </div>
        </form>
      </Card>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-on-surface">Categorias Cadastradas</h2>
        {categorias.length === 0 ? (
          <EmptyState titulo="Nenhuma categoria cadastrada" descricao="Cadastre a primeira categoria de material." />
        ) : (
          <ul className="flex flex-col gap-3">
            {categorias.map((categoria) => (
              <Card key={categoria.id} className="glow-hover">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-medium text-on-surface">{categoria.nome}</h3>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Button variante="ghost" onClick={() => iniciarEdicao(categoria)}>Editar</Button>
                  <Button variante="ghost" onClick={() => setCategoriaExcluindoId(categoria.id ?? null)}>Excluir</Button>
                </div>
              </Card>
            ))}
          </ul>
        )}
      </section>

      <ConfirmModal
        aberto={categoriaExcluindoId !== null}
        titulo="Excluir categoria?"
        descricao="Categorias com materiais vinculados não podem ser excluídas."
        onConfirmar={() => categoriaExcluindoId !== null && handleExcluir(categoriaExcluindoId)}
        onCancelar={() => setCategoriaExcluindoId(null)}
      />
    </div>
  )
}
