import { useEffect, useRef, useState } from 'react'
import { z } from 'zod'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { TextField } from '../../components/ui/TextField'
import { EmptyState } from '../../components/ui/EmptyState'
import { useToast } from '../../components/ui/useToast'
import { criarCategoriaMaterial, listarCategoriasMaterial } from './categoriasMaterialRepo'
import { criarMaterial, listarMateriais } from './materiaisRepo'
import type { CategoriaMaterial, Material } from '../../db/schema'

const schemaMaterial = z.object({
  nome: z.string().trim().min(1, 'Informe o nome do material').max(120),
  unidade: z.string().trim().min(1, 'Informe a unidade').max(20),
  quantidadeEstoque: z.number().finite().min(0, 'Quantidade em estoque não pode ser negativa'),
  custoUnitario: z.number().finite().min(0, 'Custo unitário não pode ser negativo'),
})

export function MateriaisPage() {
  const { mostrarToast } = useToast()
  const [categorias, setCategorias] = useState<CategoriaMaterial[]>([])
  const [materiais, setMateriais] = useState<Material[]>([])
  const [nome, setNome] = useState('')
  const [unidade, setUnidade] = useState('')
  const [quantidadeEstoque, setQuantidadeEstoque] = useState('')
  const [custoUnitario, setCustoUnitario] = useState('')
  const [erro, setErro] = useState<string | null>(null)

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
      let categoriaId = categorias[0]?.id
      if (!categoriaId) categoriaId = await criarCategoriaMaterial('Geral')
      await criarMaterial({ ...resultado.data, categoriaId })
    } catch (falha) {
      if (!montado.current) return
      mostrarToast(falha instanceof Error ? falha.message : 'Erro ao salvar.', 'erro')
      return
    }
    if (!montado.current) return
    mostrarToast('Material cadastrado com sucesso')
    setNome('')
    setUnidade('')
    setQuantidadeEstoque('')
    setCustoUnitario('')
    await recarregar()
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Materiais</h1>
      <Card>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <TextField id="nome-material" rotulo="Nome do material" value={nome} onChange={(e) => setNome(e.target.value)} />
          <TextField id="unidade-material" rotulo="Unidade" value={unidade} onChange={(e) => setUnidade(e.target.value)} />
          <TextField id="quantidade-material" rotulo="Quantidade em estoque" type="number" value={quantidadeEstoque} onChange={(e) => setQuantidadeEstoque(e.target.value)} />
          <TextField id="custo-material" rotulo="Custo unitário" type="number" step="0.01" value={custoUnitario} onChange={(e) => setCustoUnitario(e.target.value)} />
          {erro && <p role="alert" className="text-sm text-[var(--color-danger)]">{erro}</p>}
          <Button type="submit">Cadastrar material</Button>
        </form>
      </Card>

      {materiais.length === 0 ? (
        <EmptyState titulo="Nenhum material cadastrado" descricao="Cadastre o primeiro insumo do seu ateliê." />
      ) : (
        <ul className="flex flex-col gap-2">
          {materiais.map((material) => (
            <Card key={material.id}>
              <p className="font-medium">{material.nome}</p>
              <p className="text-sm text-[var(--color-ink-muted)]">{material.quantidadeEstoque} {material.unidade} em estoque</p>
            </Card>
          ))}
        </ul>
      )}
    </div>
  )
}
