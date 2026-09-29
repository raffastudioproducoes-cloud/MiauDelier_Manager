import { useEffect, useRef, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { TextField } from '../../components/ui/TextField'
import { EmptyState } from '../../components/ui/EmptyState'
import { ConfirmModal } from '../../components/ui/ConfirmModal'
import { Tabs } from '../../components/ui/Tabs'
import { useToast } from '../../components/ui/useToast'
import { criarCategoriaMaterial, listarCategoriasMaterial } from './categoriasMaterialRepo'
import {
  listarMateriais,
  registrarCompraMaterial,
  excluirMaterial,
} from './materiaisRepo'
import { listarContas, type ContaDecifrada } from '../financeiro/contasRepo'
import type { CategoriaMaterial, Material, TipoClassificacaoMaterial } from '../../db/schema'

// ─── Divisões padrão do sistema (fixas, sempre presentes) ──────────────────
const DIVISOES_PADRAO = [
  { id: 'consumivel', nome: 'Insumos / Consumíveis', icone: '🧪', desc: 'Resinas, silicones, pigmentos, enfeites' },
  { id: 'ferramenta', nome: 'Ferramentas & Equipamentos', icone: '🛠️', desc: 'Estufas, incubadoras, sopradores, politrizes' },
  { id: 'administrativo', nome: 'Administrativo & Embalagens', icone: '📦', desc: 'Papel, etiquetas, caixas, fitas' },
  { id: 'epi', nome: 'EPIs & Proteção', icone: '🥽', desc: 'Luvas, máscaras, toucas, refis' },
] as const

const DIVISOES_ESTOQUE = [
  { id: 'todos', rotulo: 'Todos', icone: '🌐' },
  { id: 'consumivel', rotulo: 'Insumos / Consumíveis', icone: '🧪', desc: 'Resinas, silicones, pigmentos, enfeites' },
  { id: 'ferramenta', rotulo: 'Ferramentas & Equipamentos', icone: '🛠️', desc: 'Estufas, incubadoras, sopradores, politrizes' },
  { id: 'administrativo', rotulo: 'Administrativo & Embalagens', icone: '📦', desc: 'Papel, etiquetas, caixas, fitas' },
  { id: 'epi', rotulo: 'EPIs & Proteção', icone: '🥽', desc: 'Luvas, máscaras, toucas, refis' },
] as const

function obterClassificacaoMaterial(
  material: Material,
  categorias: CategoriaMaterial[],
): TipoClassificacaoMaterial {
  if (material.tipoClassificacao) return material.tipoClassificacao
  const catPai = categorias.find((c) => c.id === material.categoriaId)
  if (catPai?.tipoClassificacao) return catPai.tipoClassificacao
  const nomeCat = (catPai?.nome ?? '').toLowerCase()
  if (nomeCat.includes('epi')) return 'epi'
  if (nomeCat.includes('ferramenta') || nomeCat.includes('equipamento')) return 'ferramenta'
  if (nomeCat.includes('administrativo') || nomeCat.includes('embalagen')) return 'administrativo'
  return 'consumivel'
}

const GRUPOS_UNIDADES = [
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

const NOMES_PADRAO_FIXOS = new Set(DIVISOES_PADRAO.map((d) => d.nome.toLowerCase()))

function formatarMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// Tipo de ID de aba de filtro: pode ser 'todos', um dos IDs padrão, ou 'cat_<id>' para divisões customizadas
type FiltroId = 'todos' | TipoClassificacaoMaterial | string

export function MateriaisPage() {
  const { mostrarToast } = useToast()
  const [abaAtiva, setAbaAtiva] = useState('estoque')
  const [filtroAtivo, setFiltroAtivo] = useState<FiltroId>('todos')
  const [categorias, setCategorias] = useState<CategoriaMaterial[]>([])
  const [materiais, setMateriais] = useState<Material[]>([])
  const [contas, setContas] = useState<ContaDecifrada[]>([])

  const [materialExcluindoId, setMaterialExcluindoId] = useState<number | null>(null)

  // Formulário Entrada de Compras / Reposição
  const [compraModo, setCompraModo] = useState<'existente' | 'novo'>('existente')
  const [compraMaterialId, setCompraMaterialId] = useState('')
  const [compraQtd, setCompraQtd] = useState('')
  const [compraValorTotal, setCompraValorTotal] = useState('')
  const [compraValorFrete, setCompraValorFrete] = useState('')
  const [compraAtualizarCusto, setCompraAtualizarCusto] = useState(true)
  const [compraContaId, setCompraContaId] = useState('')
  const [compraData, setCompraData] = useState(() => new Date().toISOString().slice(0, 10))
  const [compraNovoNome, setCompraNovoNome] = useState('')
  const [compraNovoUnidadeSelecao, setCompraNovoUnidadeSelecao] = useState('ml')
  const [compraNovoUnidadeCustom, setCompraNovoUnidadeCustom] = useState('')
  const [compraNovaDiv, setCompraNovaDiv] = useState('consumivel') // ID da divisão padrão ou 'cat_<id>' para custom

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function limparFormularioCompra() {
    setCompraModo('existente')
    setCompraMaterialId('')
    setCompraQtd('')
    setCompraValorTotal('')
    setCompraValorFrete('')
    setCompraAtualizarCusto(true)
    setCompraContaId('')
    setCompraData(new Date().toISOString().slice(0, 10))
    setCompraNovoNome('')
    setCompraNovoUnidadeSelecao('ml')
    setCompraNovoUnidadeCustom('')
    setCompraNovaDiv('consumivel')
    setErroCompra(null)
  }

  function iniciarCompraParaMaterial(materialId: number) {
    setCompraModo('existente')
    setCompraMaterialId(String(materialId))
    setAbaAtiva('compra')
  }

  // Divisões customizadas do banco (sem as padrão e sem 'Geral')
  const divisoesCustom = categorias.filter(
    (c) => !c.categoriaPaiId && c.nome !== 'Geral' && !NOMES_PADRAO_FIXOS.has(c.nome.toLowerCase()),
  )

  // Lista completa de filtros: Todos + 4 padrão + divisões custom do user
  const todosFiltros = [
    { id: 'todos', rotulo: 'Todos', icone: '🌐' },
    ...DIVISOES_ESTOQUE.filter((d) => d.id !== 'todos').map((d) => ({ id: d.id, rotulo: d.rotulo, icone: d.icone })),
    ...divisoesCustom.map((c) => ({ id: `cat_${c.id}`, rotulo: c.nome, icone: '📁' })),
  ]

  function obterMaterialClassifTotal(m: Material): FiltroId {
    // Verifica se o material tem categoria custom
    const cat = categorias.find((c) => c.id === m.categoriaId)
    if (cat && !cat.categoriaPaiId && !NOMES_PADRAO_FIXOS.has(cat.nome.toLowerCase()) && cat.nome !== 'Geral') {
      return `cat_${cat.id}`
    }
    return obterClassificacaoMaterial(m, categorias)
  }

  async function handleRegistrarCompra(evento: React.FormEvent) {
    evento.preventDefault()
    setErroCompra(null)

    const qtd = Number(compraQtd)
    const valorProdutos = Number(compraValorTotal) || 0
    const valorFrete = Number(compraValorFrete) || 0
    const valorTotal = valorProdutos + valorFrete

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
          valorFrete: valorFrete > 0 ? valorFrete : undefined,
          atualizarCustoUnitario: compraAtualizarCusto,
          novoCustoUnitarioCalculado,
          contaIdFinanceira: compraContaId ? Number(compraContaId) : undefined,
          dataCompra: compraData ? new Date(compraData).toISOString() : undefined,
        })
        mostrarToast('Estoque reposto e compra registrada com sucesso!')
      } else {
        if (!compraNovoNome.trim()) {
          setErroCompra('Informe o nome do novo material.')
          return
        }
        const unidadeFinal =
          compraNovoUnidadeSelecao === '__outra__' ? compraNovoUnidadeCustom.trim() : compraNovoUnidadeSelecao
        if (!unidadeFinal) {
          setErroCompra('Informe a unidade de medida do novo material.')
          return
        }

        // Descobrir categoriaId a partir da divisão selecionada
        let catIdFinal: number | undefined
        let tipoClassif: TipoClassificacaoMaterial | undefined

        if (compraNovaDiv.startsWith('cat_')) {
          // Divisão customizada
          catIdFinal = Number(compraNovaDiv.replace('cat_', ''))
        } else {
          // Divisão padrão: mapear para tipo e usar/criar categoria 'Geral' do banco
          tipoClassif = compraNovaDiv as TipoClassificacaoMaterial
          // Busca ou cria uma categoria 'Geral' para servir como anchor
          const catGeral = categorias.find((c) => c.nome === 'Geral')
          if (catGeral?.id) {
            catIdFinal = catGeral.id
          } else {
            catIdFinal = await criarCategoriaMaterial('Geral', undefined, undefined)
          }
        }

        await registrarCompraMaterial({
          novoMaterial: {
            nome: compraNovoNome.trim(),
            categoriaId: catIdFinal ?? 1,
            unidade: unidadeFinal,
            quantidadeEstoque: 0,
            custoUnitario: novoCustoUnitarioCalculado,
            valorFrete: valorFrete > 0 ? valorFrete : undefined,
            tipoClassificacao: tipoClassif,
          },
          quantidadeComprada: qtd,
          valorTotalPago: valorTotal,
          valorFrete: valorFrete > 0 ? valorFrete : undefined,
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

  function nomeCategoria(categoriaId: number, subcategoriaId?: number): string {
    const catPai = categorias.find((categoria) => categoria.id === categoriaId)
    const subcat = subcategoriaId ? categorias.find((categoria) => categoria.id === subcategoriaId) : null
    if (catPai && subcat) return `${catPai.nome} > ${subcat.nome}`
    return catPai?.nome ?? 'Sem categoria'
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


                <section>
                  <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h2 className="text-sm font-semibold text-on-surface">Materiais em Estoque</h2>
                      <p className="text-xs text-on-surface-variant">
                        Filtre pelas divisões do estoque para visualizar cada tipo de material.
                      </p>
                    </div>
                    <Button variante="primary" onClick={() => setAbaAtiva('compra')}>
                      🛒 Registrar Nova Compra
                    </Button>
                  </div>

                  <div className="flex flex-wrap gap-2 border-b border-outline-variant/40 pb-3 mb-4">
                    {todosFiltros.map((filtro) => {
                      const ativa = filtroAtivo === filtro.id
                      const qtd =
                        filtro.id === 'todos'
                          ? materiais.length
                          : materiais.filter((m) => obterMaterialClassifTotal(m) === filtro.id).length

                      return (
                        <button
                          key={filtro.id}
                          type="button"
                          onClick={() => setFiltroAtivo(filtro.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                            ativa
                              ? 'bg-primary text-on-primary font-semibold shadow-sm'
                              : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                          }`}
                        >
                          <span>{filtro.icone}</span>
                          <span>{filtro.rotulo}</span>
                          <span
                            className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                              ativa ? 'bg-on-primary/20 text-on-primary' : 'bg-outline-variant/40 text-on-surface'
                            }`}
                          >
                            {qtd}
                          </span>
                        </button>
                      )
                    })}
                  </div>

                  {(() => {
                    const materiaisFiltrados =
                      filtroAtivo === 'todos'
                        ? materiais
                        : materiais.filter((m) => obterMaterialClassifTotal(m) === filtroAtivo)

                    if (materiaisFiltrados.length === 0) {
                      const rotuloFiltro = todosFiltros.find((f) => f.id === filtroAtivo)?.rotulo ?? filtroAtivo
                      return (
                        <EmptyState
                          titulo={
                            filtroAtivo === 'todos'
                              ? 'Nenhum material cadastrado'
                              : `Nenhum item em "${rotuloFiltro}"`
                          }
                          descricao={
                            filtroAtivo === 'todos'
                              ? 'Cadastre o primeiro insumo ou registre uma compra.'
                              : 'Cadastre materiais atribuindo esta divisão no formulário acima.'
                          }
                        />
                      )
                    }

                    return (
                      <div className="relative pl-6 sm:pl-32 flex flex-col gap-5 before:absolute before:left-2.5 sm:before:left-[108px] before:top-3 before:bottom-3 before:w-[2px] before:bg-outline-variant/40 before:border-r before:border-dashed before:border-outline-variant/60">
                        {materiaisFiltrados.map((material) => {
                          const totalItem = material.quantidadeEstoque * material.custoUnitario
                          const ehZerado = material.quantidadeEstoque <= 0
                          const classif = obterClassificacaoMaterial(material, categorias)
                          const metaBadge =
                            classif === 'consumivel'
                              ? { label: '🧪 INSUMO', style: 'text-emerald-700 bg-emerald-500/10 border-emerald-500/30' }
                              : classif === 'ferramenta'
                              ? { label: '🛠️ FERRAMENTA', style: 'text-amber-700 bg-amber-500/10 border-amber-500/30' }
                              : classif === 'administrativo'
                              ? { label: '📦 ADM / EMBALAGEM', style: 'text-purple-700 bg-purple-500/10 border-purple-500/30' }
                              : { label: '🥽 EPI', style: 'text-cyan-700 bg-cyan-500/10 border-cyan-500/30' }

                          return (
                            <div key={material.id} className="relative flex flex-col sm:flex-row items-start gap-4">
                              <div className="hidden sm:flex flex-col items-end w-24 shrink-0 pt-1 text-right">
                                <span className="text-xs font-semibold text-on-surface uppercase tracking-wider">
                                  MATERIAL
                                </span>
                                <span className="text-[11px] text-on-surface-variant font-mono">
                                  #{material.id}
                                </span>
                              </div>

                              <div className="absolute -left-6 sm:static sm:left-auto pt-1 shrink-0 z-10">
                                <div
                                  className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shadow-sm ${
                                    ehZerado
                                      ? 'border-error bg-error/20 text-error'
                                      : 'border-primary bg-primary/20 text-primary'
                                  }`}
                                >
                                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                                </div>
                              </div>

                              <Card className="flex-1 w-full glow-hover flex flex-col gap-2">
                                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-outline-variant/30 pb-2">
                                  <div className="flex items-center gap-2">
                                    <span className="sm:hidden text-xs font-semibold uppercase text-on-surface">
                                      MATERIAL #{material.id}
                                    </span>
                                    <span className={`text-[11px] font-bold uppercase px-2 py-0.5 rounded border ${metaBadge.style}`}>
                                      {metaBadge.label}
                                    </span>
                                    <span className="text-[11px] font-bold uppercase text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                                      🏷️ {nomeCategoria(material.categoriaId, material.subcategoriaId)}
                                    </span>
                                    {ehZerado && (
                                      <span className="text-[11px] font-bold uppercase text-error bg-error/10 px-2 py-0.5 rounded border border-error/20">
                                        ⚠️ Sem Estoque
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-xs font-mono font-semibold text-primary">
                                    Total: {formatarMoeda(totalItem)}
                                  </span>
                                </div>

                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                                  <div>
                                    <h3 className="font-semibold text-base text-on-surface">{material.nome}</h3>
                                    <p className="text-xs text-on-surface-variant mt-0.5">
                                      {material.quantidadeEstoque} {material.unidade} em estoque · Custo: {formatarMoeda(material.custoUnitario)}/{material.unidade}{material.valorFrete !== undefined && material.valorFrete > 0 ? ` (Frete: ${formatarMoeda(material.valorFrete)})` : ''}
                                    </p>
                                  </div>

                                  <div className="flex flex-wrap items-center gap-2">
                                    <Button
                                      variante="ghost"
                                      className="text-xs"
                                      onClick={() => material.id !== undefined && iniciarCompraParaMaterial(material.id)}
                                    >
                                      🛒 Repor Estoque
                                    </Button>
                                    <Button variante="ghost" className="text-xs text-error hover:bg-error/10" onClick={() => setMaterialExcluindoId(material.id ?? null)}>
                                      Excluir
                                    </Button>
                                  </div>
                                </div>
                              </Card>
                            </div>
                          )
                        })}
                      </div>
                    )
                  })()}
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
                        <label htmlFor="compra-novo-divisao" className="text-sm font-medium text-on-surface">
                          Divisão / Tipo
                        </label>
                        <select
                          id="compra-novo-divisao"
                          value={compraNovaDiv}
                          onChange={(e) => setCompraNovaDiv(e.target.value)}
                          className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                        >
                          {DIVISOES_ESTOQUE.filter((d) => d.id !== 'todos').map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.icone} {d.rotulo}
                            </option>
                          ))}
                          {divisoesCustom.length > 0 && (
                            <optgroup label="Divisões Personalizadas">
                              {divisoesCustom.map((c) => (
                                <option key={c.id} value={`cat_${c.id}`}>
                                  📁 {c.nome}
                                </option>
                              ))}
                            </optgroup>
                          )}
                        </select>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <TextField
                        id="compra-qtd"
                        rotulo={`Quantidade Comprada ${materialSelecionadoCompra ? `(${materialSelecionadoCompra.unidade})` : ''}`}
                        type="number"
                        step="any"
                        value={compraQtd}
                        onChange={(e) => setCompraQtd(e.target.value)}
                      />
                      {materialSelecionadoCompra && (
                        <p className="mt-1 text-xs text-on-surface-variant flex items-center gap-1">
                          <span>📦</span>
                          <span>
                            <strong>Estoque atual:</strong> {materialSelecionadoCompra.quantidadeEstoque}{' '}
                            {materialSelecionadoCompra.unidade}. Novo total:{' '}
                            {materialSelecionadoCompra.quantidadeEstoque + (Number(compraQtd) || 0)}{' '}
                            {materialSelecionadoCompra.unidade}.
                          </span>
                        </p>
                      )}
                    </div>
                    <TextField
                      id="compra-valor-total"
                      rotulo="Valor dos Produtos (R$)"
                      type="number"
                      step="0.01"
                      value={compraValorTotal}
                      onChange={(e) => setCompraValorTotal(e.target.value)}
                    />
                    <TextField
                      id="compra-valor-frete"
                      rotulo="Valor do Frete (R$ - opcional)"
                      type="number"
                      step="0.01"
                      placeholder="Ex: 20.00"
                      value={compraValorFrete}
                      onChange={(e) => setCompraValorFrete(e.target.value)}
                    />
                  </div>

                  {Number(compraQtd) > 0 && (Number(compraValorTotal) >= 0 || Number(compraValorFrete) > 0) && (
                    <div className="rounded-lg bg-surface-container-high p-3 text-sm text-on-surface">
                      <p className="font-semibold text-primary">
                        Custo Unitário desta compra (com frete):{' '}
                        {formatarMoeda((Number(compraValorTotal) + Number(compraValorFrete || 0)) / Number(compraQtd))}/{' '}
                        {materialSelecionadoCompra
                          ? materialSelecionadoCompra.unidade
                          : compraNovoUnidadeSelecao === '__outra__'
                            ? compraNovoUnidadeCustom || 'un'
                            : compraNovoUnidadeSelecao}
                      </p>
                      {Number(compraValorFrete) > 0 && (
                        <p className="mt-0.5 text-xs text-on-surface-variant">
                          Produtos: {formatarMoeda(Number(compraValorTotal))} + Frete: {formatarMoeda(Number(compraValorFrete))} = Total: {formatarMoeda(Number(compraValorTotal) + Number(compraValorFrete))}
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
