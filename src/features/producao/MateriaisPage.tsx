import { useEffect, useRef, useState } from 'react'
import { z } from 'zod'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { TextField } from '../../components/ui/TextField'
import { Badge } from '../../components/ui/Badge'
import { EmptyState } from '../../components/ui/EmptyState'
import { ConfirmModal } from '../../components/ui/ConfirmModal'
import { useToast } from '../../components/ui/useToast'
import { criarCategoriaMaterial, listarCategoriasMaterial } from './categoriasMaterialRepo'
import {
  criarMaterial,
  listarMateriais,
  atualizarMaterial,
  reporEstoqueMaterial,
  excluirMaterial,
} from './materiaisRepo'
import type { CategoriaMaterial, Material } from '../../db/schema'

const schemaMaterial = z.object({
  nome: z.string().trim().min(1, 'Informe o nome do material').max(120),
  unidade: z.string().trim().min(1, 'Informe a unidade').max(20),
  quantidadeEstoque: z.number().finite().min(0, 'Quantidade em estoque não pode ser negativa'),
  custoUnitario: z.number().finite().min(0, 'Custo unitário não pode ser negativo'),
})

const NOVA_CATEGORIA = '__nova__'

function formatarMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function MateriaisPage() {
  const { mostrarToast } = useToast()
  const [categorias, setCategorias] = useState<CategoriaMaterial[]>([])
  const [materiais, setMateriais] = useState<Material[]>([])
  const [nome, setNome] = useState('')
  const [unidade, setUnidade] = useState('')
  const [quantidadeEstoque, setQuantidadeEstoque] = useState('')
  const [custoUnitario, setCustoUnitario] = useState('')
  const [categoriaId, setCategoriaId] = useState<string>('')
  const [novaCategoriaNome, setNovaCategoriaNome] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [materialEmEdicaoId, setMaterialEmEdicaoId] = useState<number | null>(null)
  const [materialRepondoId, setMaterialRepondoId] = useState<number | null>(null)
  const [quantidadeReposicao, setQuantidadeReposicao] = useState('')
  const [materialExcluindoId, setMaterialExcluindoId] = useState<number | null>(null)

  const montado = useRef(true)

  async function recarregar() {
    const categoriasCarregadas = await listarCategoriasMaterial()
    const materiaisCarregados = await listarMateriais()
    if (!montado.current) return
    setCategorias(categoriasCarregadas)
    setMateriais(materiaisCarregados)
  }

  useEffect(() => {
    montado.current = true
    recarregar().catch((falha) => {
      if (!montado.current) return
      mostrarToast(falha instanceof Error ? falha.message : 'Erro ao carregar materiais.', 'erro')
    })
    return () => {
      montado.current = false
    }
  }, [])

  function limparFormulario() {
    setNome('')
    setUnidade('')
    setQuantidadeEstoque('')
    setCustoUnitario('')
    setCategoriaId('')
    setNovaCategoriaNome('')
    setMaterialEmEdicaoId(null)
  }

  function iniciarEdicao(material: Material) {
    setMaterialEmEdicaoId(material.id ?? null)
    setNome(material.nome)
    setUnidade(material.unidade)
    setQuantidadeEstoque(String(material.quantidadeEstoque))
    setCustoUnitario(String(material.custoUnitario))
    setCategoriaId(String(material.categoriaId))
    setNovaCategoriaNome('')
  }

  async function handleSubmit(evento: React.FormEvent) {
    evento.preventDefault()
    setErro(null)

    const resultado = schemaMaterial.safeParse({
      nome,
      unidade,
      quantidadeEstoque: Number(quantidadeEstoque),
      custoUnitario: Number(custoUnitario),
    })

    if (!resultado.success) {
      setErro(resultado.error.issues[0]?.message ?? 'Dados inválidos')
      return
    }

    try {
      let categoriaIdFinal: number | undefined
      if (categoriaId === NOVA_CATEGORIA) {
        if (!novaCategoriaNome.trim()) {
          setErro('Informe o nome da nova categoria')
          return
        }
        categoriaIdFinal = await criarCategoriaMaterial(novaCategoriaNome.trim())
      } else if (categoriaId) {
        categoriaIdFinal = Number(categoriaId)
      } else {
        categoriaIdFinal = categorias[0]?.id
        if (!categoriaIdFinal) categoriaIdFinal = await criarCategoriaMaterial('Geral')
      }

      if (materialEmEdicaoId !== null) {
        const { quantidadeEstoque: _omit, ...dadosSemEstoque } = resultado.data
        await atualizarMaterial(materialEmEdicaoId, { ...dadosSemEstoque, categoriaId: categoriaIdFinal })
      } else {
        await criarMaterial({ ...resultado.data, categoriaId: categoriaIdFinal })
      }
    } catch (falha) {
      if (!montado.current) return
      mostrarToast(falha instanceof Error ? falha.message : 'Erro ao salvar.', 'erro')
      return
    }
    if (!montado.current) return
    mostrarToast(materialEmEdicaoId !== null ? 'Material atualizado com sucesso' : 'Material cadastrado com sucesso')
    limparFormulario()
    await recarregar()
  }

  async function handleReporEstoque(materialId: number) {
    const quantidade = Number(quantidadeReposicao)
    if (!Number.isFinite(quantidade) || quantidade <= 0) {
      mostrarToast('Informe uma quantidade válida para adicionar', 'erro')
      return
    }
    try {
      await reporEstoqueMaterial(materialId, quantidade)
    } catch (falha) {
      if (!montado.current) return
      mostrarToast(falha instanceof Error ? falha.message : 'Erro ao repor estoque.', 'erro')
      return
    }
    if (!montado.current) return
    mostrarToast('Estoque reposto com sucesso')
    setMaterialRepondoId(null)
    setQuantidadeReposicao('')
    await recarregar()
  }

  async function handleExcluir(materialId: number) {
    try {
      await excluirMaterial(materialId)
    } catch (falha) {
      if (!montado.current) return
      mostrarToast(falha instanceof Error ? falha.message : 'Erro ao excluir material.', 'erro')
      return
    }
    if (!montado.current) return
    mostrarToast('Material excluído com sucesso')
    setMaterialExcluindoId(null)
    await recarregar()
  }

  function nomeCategoria(id: number): string {
    return categorias.find((categoria) => categoria.id === id)?.nome ?? 'Sem categoria'
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-on-surface">Materiais</h1>
        <p className="text-label-sm text-on-surface-variant">Estoque de insumos do ateliê.</p>
      </div>

      <Card>
        <h2 className="mb-3 font-medium text-on-surface">
          {materialEmEdicaoId !== null ? 'Editar material' : 'Cadastrar material'}
        </h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <TextField id="nome-material" rotulo="Nome do material" value={nome} onChange={(e) => setNome(e.target.value)} />
          <TextField id="unidade-material" rotulo="Unidade" value={unidade} onChange={(e) => setUnidade(e.target.value)} />
          <TextField
            id="quantidade-material"
            rotulo={materialEmEdicaoId !== null ? 'Quantidade em estoque (use "Repor estoque" para alterar)' : 'Quantidade em estoque'}
            type="number"
            value={quantidadeEstoque}
            onChange={(e) => setQuantidadeEstoque(e.target.value)}
            disabled={materialEmEdicaoId !== null}
          />
          <TextField id="custo-material" rotulo="Custo unitário" type="number" step="0.01" value={custoUnitario} onChange={(e) => setCustoUnitario(e.target.value)} />

          <div className="flex flex-col gap-1">
            <label htmlFor="categoria-material" className="text-sm font-medium text-on-surface">Categoria</label>
            <select
              id="categoria-material"
              value={categoriaId}
              onChange={(e) => setCategoriaId(e.target.value)}
              className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            >
              <option value="">Selecione</option>
              {categorias.map((categoria) => (
                <option key={categoria.id} value={categoria.id}>{categoria.nome}</option>
              ))}
              <option value={NOVA_CATEGORIA}>+ Nova categoria</option>
            </select>
          </div>
          {categoriaId === NOVA_CATEGORIA && (
            <TextField
              id="nova-categoria-material"
              rotulo="Nome da nova categoria"
              value={novaCategoriaNome}
              onChange={(e) => setNovaCategoriaNome(e.target.value)}
            />
          )}

          {erro && <p role="alert" className="text-sm text-error">{erro}</p>}
          <div className="flex gap-2">
            <Button type="submit">{materialEmEdicaoId !== null ? 'Salvar' : 'Cadastrar material'}</Button>
            {materialEmEdicaoId !== null && (
              <Button type="button" variante="ghost" onClick={limparFormulario}>Cancelar edição</Button>
            )}
          </div>
        </form>
      </Card>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-on-surface">Todos os Materiais</h2>
        {materiais.length === 0 ? (
          <EmptyState titulo="Nenhum material cadastrado" descricao="Cadastre o primeiro insumo do seu ateliê." />
        ) : (
          <ul className="flex flex-col gap-3">
            {materiais.map((material) => {
              const critico = material.quantidadeEstoque < 1
              return (
                <Card key={material.id} className="glow-hover">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-medium text-on-surface">{material.nome}</h3>
                    {critico && <Badge variant="danger">Estoque baixo</Badge>}
                  </div>
                  <p className="mt-1 text-label-sm text-on-surface-variant">
                    {material.quantidadeEstoque} {material.unidade} em estoque · {formatarMoeda(material.custoUnitario)} · {nomeCategoria(material.categoriaId)}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Button variante="ghost" onClick={() => iniciarEdicao(material)}>Editar</Button>
                    <Button variante="ghost" onClick={() => setMaterialRepondoId(material.id ?? null)}>Repor estoque</Button>
                    <Button variante="ghost" onClick={() => setMaterialExcluindoId(material.id ?? null)}>Excluir</Button>
                  </div>
                  {materialRepondoId === material.id && (
                    <div className="mt-2 flex items-end gap-2">
                      <TextField
                        id={`reposicao-${material.id}`}
                        rotulo="Quantidade a adicionar"
                        type="number"
                        value={quantidadeReposicao}
                        onChange={(e) => setQuantidadeReposicao(e.target.value)}
                      />
                      <Button onClick={() => material.id !== undefined && handleReporEstoque(material.id)}>Adicionar</Button>
                    </div>
                  )}
                </Card>
              )
            })}
          </ul>
        )}
      </section>

      <ConfirmModal
        aberto={materialExcluindoId !== null}
        titulo="Excluir material?"
        descricao="Isso não afeta peças já criadas com este material."
        onConfirmar={() => materialExcluindoId !== null && handleExcluir(materialExcluindoId)}
        onCancelar={() => setMaterialExcluindoId(null)}
      />
    </div>
  )
}
