import { useEffect, useRef, useState } from 'react'
import { z } from 'zod'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { TextField } from '../../components/ui/TextField'
import { EmptyState } from '../../components/ui/EmptyState'
import { ConfirmModal } from '../../components/ui/ConfirmModal'
import { Tabs } from '../../components/ui/Tabs'
import { useToast } from '../../components/ui/useToast'
import { criarCategoriaMaterial, listarCategoriasMaterial } from './categoriasMaterialRepo'
import {
  criarMaterial,
  listarMateriais,
  atualizarMaterial,
  registrarCompraMaterial,
  excluirMaterial,
} from './materiaisRepo'
import { listarContas, type ContaDecifrada } from '../financeiro/contasRepo'
import type { CategoriaMaterial, Material } from '../../db/schema'

const schemaMaterial = z.object({
  nome: z.string().trim().min(1, 'Informe o nome do material').max(120),
  unidade: z.string().trim().min(1, 'Informe a unidade').max(20),
  quantidadeEstoque: z.number().finite().min(0, 'Quantidade em estoque não pode ser negativa'),
  custoUnitario: z.number().finite().min(0, 'Custo unitário não pode ser negativo'),
})

export const GRUPOS_UNIDADES = [
  {
    titulo: 'Volume / Líquido',
    opcoes: [
      { valor: 'ml', rotulo: 'Mililitro (ml)' },
      { valor: 'l', rotulo: 'Litro (l)' },
    ],
  },
  {
    titulo: 'Massa / Sólido / Grão',
    opcoes: [
      { valor: 'g', rotulo: 'Grama (g)' },
      { valor: 'kg', rotulo: 'Quilograma (kg)' },
    ],
  },
  {
    titulo: 'Unidades e Contagem',
    opcoes: [
      { valor: 'un', rotulo: 'Unidade (un)' },
      { valor: 'par', rotulo: 'Par (par)' },
      { valor: 'pct', rotulo: 'Pacote (pct)' },
      { valor: 'cx', rotulo: 'Caixa (cx)' },
      { valor: 'kit', rotulo: 'Kit (kit)' },
      { valor: 'folha', rotulo: 'Folha (folha)' },
      { valor: 'rolo', rotulo: 'Rolo (rolo)' },
    ],
  },
  {
    titulo: 'Comprimento / Dimensão',
    opcoes: [
      { valor: 'cm', rotulo: 'Centímetro (cm)' },
      { valor: 'm', rotulo: 'Metro (m)' },
    ],
  },
]

export const VALORES_UNIDADES_PADRAO = GRUPOS_UNIDADES.flatMap((g) => g.opcoes.map((o) => o.valor))

const NOVA_CATEGORIA = '__nova__'

function formatarMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function MateriaisPage() {
  const { mostrarToast } = useToast()
  const [abaAtiva, setAbaAtiva] = useState('estoque')
  const [categorias, setCategorias] = useState<CategoriaMaterial[]>([])
  const [materiais, setMateriais] = useState<Material[]>([])
  const [contas, setContas] = useState<ContaDecifrada[]>([])

  // Formulário Cadastro / Edição Básica
  const [nome, setNome] = useState('')
  const [unidadeSelecao, setUnidadeSelecao] = useState('ml')
  const [unidadeCustom, setUnidadeCustom] = useState('')
  const [quantidadeEstoque, setQuantidadeEstoque] = useState('')
  const [custoUnitario, setCustoUnitario] = useState('')
  const [categoriaId, setCategoriaId] = useState<string>('')
  const [novaCategoriaNome, setNovaCategoriaNome] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [materialEmEdicaoId, setMaterialEmEdicaoId] = useState<number | null>(null)
  const [materialExcluindoId, setMaterialExcluindoId] = useState<number | null>(null)

  // Formulário Entrada de Compras / Reposição
  const [compraModo, setCompraModo] = useState<'existente' | 'novo'>('existente')
  const [compraMaterialId, setCompraMaterialId] = useState('')
  const [compraQtd, setCompraQtd] = useState('')
  const [compraValorTotal, setCompraValorTotal] = useState('')
  const [compraAtualizarCusto, setCompraAtualizarCusto] = useState(true)
  const [compraContaId, setCompraContaId] = useState('')
  const [compraData, setCompraData] = useState(() => new Date().toISOString().slice(0, 10))
  const [compraNovoNome, setCompraNovoNome] = useState('')
  const [compraNovoUnidadeSelecao, setCompraNovoUnidadeSelecao] = useState('ml')
  const [compraNovoUnidadeCustom, setCompraNovoUnidadeCustom] = useState('')
  const [compraNovoCategoriaId, setCompraNovoCategoriaId] = useState('')
  const [compraNovaCategoriaNome, setCompraNovaCategoriaNome] = useState('')
  const [erroCompra, setErroCompra] = useState<string | null>(null)

  const montado = useRef(true)

  async function recarregar() {
    const categoriasCarregadas = await listarCategoriasMaterial()
    const materiaisCarregados = await listarMateriais()
    const contasCarregadas = await listarContas()
    if (!montado.current) return
    setCategorias(categoriasCarregadas)
    setMateriais(materiaisCarregados)
    setContas(contasCarregadas)
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
    setUnidadeSelecao('ml')
    setUnidadeCustom('')
    setQuantidadeEstoque('')
    setCustoUnitario('')
    setCategoriaId('')
    setNovaCategoriaNome('')
    setMaterialEmEdicaoId(null)
  }

  function limparFormularioCompra() {
    setCompraModo('existente')
    setCompraMaterialId('')
    setCompraQtd('')
    setCompraValorTotal('')
    setCompraAtualizarCusto(true)
    setCompraContaId('')
    setCompraData(new Date().toISOString().slice(0, 10))
    setCompraNovoNome('')
    setCompraNovoUnidadeSelecao('ml')
    setCompraNovoUnidadeCustom('')
    setCompraNovoCategoriaId('')
    setCompraNovaCategoriaNome('')
    setErroCompra(null)
  }

  function iniciarEdicao(material: Material) {
    setMaterialEmEdicaoId(material.id ?? null)
    setNome(material.nome)
    const ehPadrao = VALORES_UNIDADES_PADRAO.includes(material.unidade)
    if (ehPadrao) {
      setUnidadeSelecao(material.unidade)
      setUnidadeCustom('')
    } else {
      setUnidadeSelecao('__outra__')
      setUnidadeCustom(material.unidade)
    }
    setQuantidadeEstoque(String(material.quantidadeEstoque))
    setCustoUnitario(String(material.custoUnitario))
    setCategoriaId(String(material.categoriaId))
    setNovaCategoriaNome('')
  }

  function iniciarCompraParaMaterial(materialId: number) {
    setCompraModo('existente')
    setCompraMaterialId(String(materialId))
    setAbaAtiva('compra')
  }

  async function handleSubmit(evento: React.FormEvent) {
    evento.preventDefault()
    setErro(null)

    const unidadeFinal = unidadeSelecao === '__outra__' ? unidadeCustom.trim() : unidadeSelecao

    const resultado = schemaMaterial.safeParse({
      nome,
      unidade: unidadeFinal,
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

  async function handleRegistrarCompra(evento: React.FormEvent) {
    evento.preventDefault()
    setErroCompra(null)

    const qtd = Number(compraQtd)
    const valorTotal = Number(compraValorTotal)

    if (!Number.isFinite(qtd) || qtd <= 0) {
      setErroCompra('Informe uma quantidade comprada válida e maior que zero.')
      return
    }

    if (!Number.isFinite(valorTotal) || valorTotal < 0) {
      setErroCompra('Informe o valor total pago (ou 0 se for brinde/amostra).')
      return
    }

    const novoCustoUnitarioCalculado = qtd > 0 ? valorTotal / qtd : 0

    try {
      if (compraModo === 'existente') {
        const matId = Number(compraMaterialId)
        if (!matId) {
          setErroCompra('Selecione o material que deseja repor.')
          return
        }
        await registrarCompraMaterial({
          materialId: matId,
          quantidadeComprada: qtd,
          valorTotalPago: valorTotal,
          atualizarCustoUnitario: compraAtualizarCusto,
          novoCustoUnitarioCalculado,
          contaIdFinanceira: compraContaId ? Number(compraContaId) : undefined,
          dataCompra: compraData ? new Date(compraData).toISOString() : undefined,
        })
        mostrarToast('Estoque reposto e compra registrada com sucesso!')
      } else {
        if (!compraNovoNome.trim()) {
          setErroCompra('Informe o nome do novo material recém-comprado.')
          return
        }
        const unidadeFinal =
          compraNovoUnidadeSelecao === '__outra__' ? compraNovoUnidadeCustom.trim() : compraNovoUnidadeSelecao
        if (!unidadeFinal) {
          setErroCompra('Informe a unidade de medida do novo material.')
          return
        }

        let catIdFinal: number | undefined
        if (compraNovoCategoriaId === NOVA_CATEGORIA) {
          if (!compraNovaCategoriaNome.trim()) {
            setErroCompra('Informe o nome da nova categoria.')
            return
          }
          catIdFinal = await criarCategoriaMaterial(compraNovaCategoriaNome.trim())
        } else if (compraNovoCategoriaId) {
          catIdFinal = Number(compraNovoCategoriaId)
        } else {
          catIdFinal = categorias[0]?.id ?? (await criarCategoriaMaterial('Geral'))
        }

        await registrarCompraMaterial({
          novoMaterial: {
            nome: compraNovoNome.trim(),
            categoriaId: catIdFinal,
            unidade: unidadeFinal,
            quantidadeEstoque: 0,
            custoUnitario: novoCustoUnitarioCalculado,
          },
          quantidadeComprada: qtd,
          valorTotalPago: valorTotal,
          atualizarCustoUnitario: true,
          novoCustoUnitarioCalculado,
          contaIdFinanceira: compraContaId ? Number(compraContaId) : undefined,
          dataCompra: compraData ? new Date(compraData).toISOString() : undefined,
        })
        mostrarToast('Novo material cadastrado e compra registrada com sucesso!')
      }

      limparFormularioCompra()
      setAbaAtiva('estoque')
      await recarregar()
    } catch (falha) {
      if (!montado.current) return
      mostrarToast(falha instanceof Error ? falha.message : 'Erro ao registrar compra.', 'erro')
    }
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

  const materialSelecionadoCompra = materiais.find((m) => String(m.id) === compraMaterialId)
  const valorTotalEstoque = materiais.reduce((acc, m) => acc + m.quantidadeEstoque * m.custoUnitario, 0)
  const itensEstoqueBaixo = materiais.filter((m) => m.quantidadeEstoque <= 0).length

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-on-surface">Materiais & Insumos</h1>
        <p className="text-label-sm text-on-surface-variant">
          Controle de estoque, compras e custos unitários do ateliê.
        </p>
      </div>

      <Tabs
        abaAtiva={abaAtiva}
        onMudarAba={setAbaAtiva}
        abas={[
          {
            id: 'estoque',
            rotulo: '📦 Estoque Atual',
            conteudo: (
              <div className="flex flex-col gap-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Card>
                    <p className="text-xs font-medium text-on-surface-variant">Materiais Cadastrados</p>
                    <p className="mt-1 text-2xl font-semibold text-on-surface">{materiais.length}</p>
                  </Card>
                  <Card>
                    <p className="text-xs font-medium text-on-surface-variant">Valor Investido em Estoque</p>
                    <p className="mt-1 text-2xl font-semibold text-primary">{formatarMoeda(valorTotalEstoque)}</p>
                  </Card>
                  <Card>
                    <p className="text-xs font-medium text-on-surface-variant">Itens Zerados</p>
                    <p
                      className={`mt-1 text-2xl font-semibold ${itensEstoqueBaixo > 0 ? 'text-error' : 'text-on-surface'}`}
                    >
                      {itensEstoqueBaixo}
                    </p>
                  </Card>
                </div>

                <Card>
                  <h2 className="mb-3 font-medium text-on-surface">
                    {materialEmEdicaoId !== null ? 'Editar material' : 'Novo material (cadastro básico)'}
                  </h2>
                  <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                    <TextField
                      id="nome-material"
                      rotulo="Nome do material"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                    />

                    <div className="flex flex-col gap-1">
                      <label htmlFor="unidade-material" className="text-sm font-medium text-on-surface">
                        Unidade de Medida
                      </label>
                      <select
                        id="unidade-material"
                        value={unidadeSelecao}
                        onChange={(e) => setUnidadeSelecao(e.target.value)}
                        className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                      >
                        {GRUPOS_UNIDADES.map((grupo) => (
                          <optgroup key={grupo.titulo} label={grupo.titulo}>
                            {grupo.opcoes.map((opcao) => (
                              <option key={opcao.valor} value={opcao.valor}>
                                {opcao.rotulo}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                        <option value="__outra__">+ Outra unidade (especificar)</option>
                      </select>
                    </div>
                    {unidadeSelecao === '__outra__' && (
                      <TextField
                        id="unidade-custom-material"
                        rotulo="Especificar unidade (ex: gota, bisnaga, frasco)"
                        value={unidadeCustom}
                        onChange={(e) => setUnidadeCustom(e.target.value)}
                      />
                    )}

                    <TextField
                      id="quantidade-material"
                      rotulo={
                        materialEmEdicaoId !== null
                          ? 'Quantidade em estoque (use a aba de Compras para repor)'
                          : 'Quantidade em estoque inicial'
                      }
                      type="number"
                      value={quantidadeEstoque}
                      onChange={(e) => setQuantidadeEstoque(e.target.value)}
                      disabled={materialEmEdicaoId !== null}
                    />
                    <TextField
                      id="custo-material"
                      rotulo="Custo unitário (R$)"
                      type="number"
                      step="0.001"
                      value={custoUnitario}
                      onChange={(e) => setCustoUnitario(e.target.value)}
                    />

                    <div className="flex flex-col gap-1">
                      <label htmlFor="categoria-material" className="text-sm font-medium text-on-surface">
                        Categoria
                      </label>
                      <select
                        id="categoria-material"
                        value={categoriaId}
                        onChange={(e) => setCategoriaId(e.target.value)}
                        className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                      >
                        <option value="">Selecione</option>
                        {categorias.map((categoria) => (
                          <option key={categoria.id} value={categoria.id}>
                            {categoria.nome}
                          </option>
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

                    {erro && (
                      <p role="alert" className="text-sm text-error">
                        {erro}
                      </p>
                    )}
                    <div className="flex gap-2">
                      <Button type="submit">{materialEmEdicaoId !== null ? 'Salvar' : 'Cadastrar material'}</Button>
                      {materialEmEdicaoId !== null && (
                        <Button type="button" variante="ghost" onClick={limparFormulario}>
                          Cancelar edição
                        </Button>
                      )}
                    </div>
                  </form>
                </Card>

                <section>
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-on-surface">Todos os Materiais em Estoque</h2>
                    <Button variante="primary" onClick={() => setAbaAtiva('compra')}>
                      🛒 Registrar Nova Compra
                    </Button>
                  </div>
                  {materiais.length === 0 ? (
                    <EmptyState
                      titulo="Nenhum material em estoque"
                      descricao="Cadastre o primeiro insumo ou registre uma compra."
                    />
                  ) : (
                    <ul className="flex flex-col gap-3">
                      {materiais.map((material) => {
                        const totalItem = material.quantidadeEstoque * material.custoUnitario
                        return (
                          <Card key={material.id} className="glow-hover">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div>
                                <h3 className="font-medium text-on-surface">{material.nome}</h3>
                                <p className="mt-0.5 text-label-sm text-on-surface-variant">
                                  <span className="font-semibold text-on-surface">
                                    {material.quantidadeEstoque} {material.unidade}
                                  </span>{' '}
                                  em estoque · Custo: {formatarMoeda(material.custoUnitario)}/{material.unidade} · Total:{' '}
                                  <span className="font-medium text-primary">{formatarMoeda(totalItem)}</span> · Categoria:{' '}
                                  {nomeCategoria(material.categoriaId)}
                                </p>
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                <Button
                                  variante="ghost"
                                  onClick={() => material.id !== undefined && iniciarCompraParaMaterial(material.id)}
                                >
                                  🛒 Repor / Comprar
                                </Button>
                                <Button variante="ghost" onClick={() => iniciarEdicao(material)}>
                                  Editar
                                </Button>
                                <Button variante="ghost" onClick={() => setMaterialExcluindoId(material.id ?? null)}>
                                  Excluir
                                </Button>
                              </div>
                            </div>
                          </Card>
                        )
                      })}
                    </ul>
                  )}
                </section>
              </div>
            ),
          },
          {
            id: 'compra',
            rotulo: '🛒 Registrar Compra / Reposição',
            conteudo: (
              <Card>
                <div className="mb-4">
                  <h2 className="text-lg font-semibold text-on-surface">Entrada de Produtos Recém-Comprados</h2>
                  <p className="mt-1 text-sm text-on-surface-variant">
                    Registre a compra de novos insumos para repor estoque, recalcular custo unitário e lançar a despesa
                    automaticamente no caixa.
                  </p>
                </div>

                <form onSubmit={handleRegistrarCompra} className="flex flex-col gap-4">
                  <div className="flex gap-4 border-b border-outline-variant pb-3">
                    <label className="flex items-center gap-2 text-sm font-medium text-on-surface cursor-pointer">
                      <input
                        type="radio"
                        name="compraModo"
                        value="existente"
                        checked={compraModo === 'existente'}
                        onChange={() => setCompraModo('existente')}
                        className="text-primary focus:ring-primary"
                      />
                      Repor material existente
                    </label>
                    <label className="flex items-center gap-2 text-sm font-medium text-on-surface cursor-pointer">
                      <input
                        type="radio"
                        name="compraModo"
                        value="novo"
                        checked={compraModo === 'novo'}
                        onChange={() => setCompraModo('novo')}
                        className="text-primary focus:ring-primary"
                      />
                      + Cadastrar e comprar novo material
                    </label>
                  </div>

                  {compraModo === 'existente' ? (
                    <div className="flex flex-col gap-1">
                      <label htmlFor="compra-material" className="text-sm font-medium text-on-surface">
                        Selecione o Material Comprado
                      </label>
                      <select
                        id="compra-material"
                        value={compraMaterialId}
                        onChange={(e) => setCompraMaterialId(e.target.value)}
                        className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                      >
                        <option value="">Selecione o produto...</option>
                        {materiais.map((mat) => (
                          <option key={mat.id} value={mat.id}>
                            {mat.nome} ({mat.quantidadeEstoque} {mat.unidade} atual · Custo: {formatarMoeda(mat.custoUnitario)}/{mat.unidade})
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3 rounded-lg bg-surface-container p-3 border border-outline-variant">
                      <h3 className="text-sm font-semibold text-on-surface">Dados do Novo Material</h3>
                      <TextField
                        id="compra-novo-nome"
                        rotulo="Nome do produto"
                        value={compraNovoNome}
                        onChange={(e) => setCompraNovoNome(e.target.value)}
                      />

                      <div className="flex flex-col gap-1">
                        <label htmlFor="compra-novo-unidade" className="text-sm font-medium text-on-surface">
                          Unidade de Medida
                        </label>
                        <select
                          id="compra-novo-unidade"
                          value={compraNovoUnidadeSelecao}
                          onChange={(e) => setCompraNovoUnidadeSelecao(e.target.value)}
                          className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                        >
                          {GRUPOS_UNIDADES.map((grupo) => (
                            <optgroup key={grupo.titulo} label={grupo.titulo}>
                              {grupo.opcoes.map((opcao) => (
                                <option key={opcao.valor} value={opcao.valor}>
                                  {opcao.rotulo}
                                </option>
                              ))}
                            </optgroup>
                          ))}
                          <option value="__outra__">+ Outra unidade (especificar)</option>
                        </select>
                      </div>
                      {compraNovoUnidadeSelecao === '__outra__' && (
                        <TextField
                          id="compra-novo-unidade-custom"
                          rotulo="Especificar unidade"
                          value={compraNovoUnidadeCustom}
                          onChange={(e) => setCompraNovoUnidadeCustom(e.target.value)}
                        />
                      )}

                      <div className="flex flex-col gap-1">
                        <label htmlFor="compra-novo-categoria" className="text-sm font-medium text-on-surface">
                          Categoria
                        </label>
                        <select
                          id="compra-novo-categoria"
                          value={compraNovoCategoriaId}
                          onChange={(e) => setCompraNovoCategoriaId(e.target.value)}
                          className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                        >
                          <option value="">Selecione a categoria</option>
                          {categorias.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.nome}
                            </option>
                          ))}
                          <option value={NOVA_CATEGORIA}>+ Nova categoria</option>
                        </select>
                      </div>

                      {compraNovoCategoriaId === NOVA_CATEGORIA && (
                        <TextField
                          id="compra-nova-categoria-nome"
                          rotulo="Nome da nova categoria"
                          value={compraNovaCategoriaNome}
                          onChange={(e) => setCompraNovaCategoriaNome(e.target.value)}
                        />
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <TextField
                      id="compra-qtd"
                      rotulo={`Quantidade Comprada ${materialSelecionadoCompra ? `(${materialSelecionadoCompra.unidade})` : ''}`}
                      type="number"
                      step="any"
                      value={compraQtd}
                      onChange={(e) => setCompraQtd(e.target.value)}
                    />
                    <TextField
                      id="compra-valor-total"
                      rotulo="Valor Total Pago (R$)"
                      type="number"
                      step="0.01"
                      value={compraValorTotal}
                      onChange={(e) => setCompraValorTotal(e.target.value)}
                    />
                  </div>

                  {Number(compraQtd) > 0 && Number(compraValorTotal) >= 0 && (
                    <div className="rounded-lg bg-surface-container-high p-3 text-sm text-on-surface">
                      <p className="font-semibold text-primary">
                        Custo Unitário desta compra:{' '}
                        {formatarMoeda(Number(compraValorTotal) / Number(compraQtd))}/{' '}
                        {materialSelecionadoCompra
                          ? materialSelecionadoCompra.unidade
                          : compraNovoUnidadeSelecao === '__outra__'
                            ? compraNovoUnidadeCustom || 'un'
                            : compraNovoUnidadeSelecao}
                      </p>
                      {materialSelecionadoCompra && (
                        <p className="mt-1 text-xs text-on-surface-variant">
                          Custo cadastrado atual: {formatarMoeda(materialSelecionadoCompra.custoUnitario)}/
                          {materialSelecionadoCompra.unidade}
                        </p>
                      )}
                    </div>
                  )}

                  {compraModo === 'existente' && (
                    <label className="flex items-center gap-2 text-sm text-on-surface cursor-pointer">
                      <input
                        type="checkbox"
                        checked={compraAtualizarCusto}
                        onChange={(e) => setCompraAtualizarCusto(e.target.checked)}
                        className="rounded text-primary focus:ring-primary"
                      />
                      Atualizar o custo unitário do cadastro para o custo desta nova compra
                    </label>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label htmlFor="compra-conta" className="text-sm font-medium text-on-surface">
                        Lançar Despesa no Financeiro
                      </label>
                      <select
                        id="compra-conta"
                        value={compraContaId}
                        onChange={(e) => setCompraContaId(e.target.value)}
                        className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                      >
                        <option value="">Não lançar no financeiro</option>
                        {contas.map((conta) => (
                          <option key={conta.id} value={conta.id}>
                            {conta.nome} (Saldo atual: {formatarMoeda(conta.saldo)})
                          </option>
                        ))}
                      </select>
                    </div>

                    <TextField
                      id="compra-data"
                      rotulo="Data da Compra"
                      type="date"
                      value={compraData}
                      onChange={(e) => setCompraData(e.target.value)}
                    />
                  </div>

                  {erroCompra && (
                    <p role="alert" className="text-sm text-error">
                      {erroCompra}
                    </p>
                  )}

                  <div className="flex gap-2 mt-2">
                    <Button type="submit">Confirmar Compra e Atualizar Estoque</Button>
                    <Button type="button" variante="ghost" onClick={limparFormularioCompra}>
                      Limpar
                    </Button>
                  </div>
                </form>
              </Card>
            ),
          },
        ]}
      />

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

