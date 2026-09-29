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
  quantidadeEstoque: z.number().finite().min(0, 'Quantidade em estoque n├úo pode ser negativa'),
  custoUnitario: z.number().finite().min(0, 'Custo unit├írio n├úo pode ser negativo'),
  valorFrete: z.number().finite().min(0, 'Valor do frete n├úo pode ser negativo').optional(),
})

export const GRUPOS_UNIDADES = [
  {
    titulo: 'Volume / L├¡quido',
    opcoes: [
      { valor: 'ml', rotulo: 'Mililitro (ml)' },
      { valor: 'l', rotulo: 'Litro (l)' },
    ],
  },
  {
    titulo: 'Massa / S├│lido / Gr├úo',
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
    titulo: 'Comprimento / Dimens├úo',
    opcoes: [
      { valor: 'cm', rotulo: 'Cent├¡metro (cm)' },
      { valor: 'm', rotulo: 'Metro (m)' },
    ],
  },
]

export const VALORES_UNIDADES_PADRAO = GRUPOS_UNIDADES.flatMap((g) => g.opcoes.map((o) => o.valor))

const NOVA_CATEGORIA = '__nova__'
const NOVA_SUBCATEGORIA = '__nova_sub__'

function formatarMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function MateriaisPage() {
  const { mostrarToast } = useToast()
  const [abaAtiva, setAbaAtiva] = useState('estoque')
  const [categorias, setCategorias] = useState<CategoriaMaterial[]>([])
  const [materiais, setMateriais] = useState<Material[]>([])
  const [contas, setContas] = useState<ContaDecifrada[]>([])

  // Formul├írio Cadastro / Edi├º├úo B├ísica
  const [nome, setNome] = useState('')
  const [unidadeSelecao, setUnidadeSelecao] = useState('ml')
  const [unidadeCustom, setUnidadeCustom] = useState('')
  const [quantidadeEstoque, setQuantidadeEstoque] = useState('')
  const [custoUnitario, setCustoUnitario] = useState('')
  const [valorFrete, setValorFrete] = useState('')
  const [categoriaId, setCategoriaId] = useState<string>('')
  const [subcategoriaId, setSubcategoriaId] = useState<string>('')
  const [novaCategoriaNome, setNovaCategoriaNome] = useState('')
  const [novaSubcategoriaNome, setNovaSubcategoriaNome] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [materialEmEdicaoId, setMaterialEmEdicaoId] = useState<number | null>(null)
  const [materialExcluindoId, setMaterialExcluindoId] = useState<number | null>(null)

  // Formul├írio Entrada de Compras / Reposi├º├úo
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
  const [compraNovoCategoriaId, setCompraNovoCategoriaId] = useState('')
  const [compraNovoSubcategoriaId, setCompraNovoSubcategoriaId] = useState('')
  const [compraNovaCategoriaNome, setCompraNovaCategoriaNome] = useState('')
  const [compraNovaSubcategoriaNome, setCompraNovaSubcategoriaNome] = useState('')
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
    setValorFrete('')
    setCategoriaId('')
    setSubcategoriaId('')
    setNovaCategoriaNome('')
    setNovaSubcategoriaNome('')
    setMaterialEmEdicaoId(null)
  }

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
    setCompraNovoCategoriaId('')
    setCompraNovoSubcategoriaId('')
    setCompraNovaCategoriaNome('')
    setCompraNovaSubcategoriaNome('')
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
    setValorFrete(material.valorFrete ? String(material.valorFrete) : '')
    setCategoriaId(String(material.categoriaId))
    setSubcategoriaId(material.subcategoriaId ? String(material.subcategoriaId) : '')
    setNovaCategoriaNome('')
    setNovaSubcategoriaNome('')
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
    const freteVal = Number(valorFrete) || 0
    const qtdNum = Number(quantidadeEstoque) || 0
    const custoBase = Number(custoUnitario) || 0
    const custoUnitarioFinal = qtdNum > 0 && freteVal > 0 ? custoBase + (freteVal / qtdNum) : custoBase

    const resultado = schemaMaterial.safeParse({
      nome,
      unidade: unidadeFinal,
      quantidadeEstoque: qtdNum,
      custoUnitario: custoUnitarioFinal,
      valorFrete: freteVal > 0 ? freteVal : undefined,
    })

    if (!resultado.success) {
      setErro(resultado.error.issues[0]?.message ?? 'Dados inv├ílidos')
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
        categoriaIdFinal = categorias.find((c) => !c.categoriaPaiId)?.id
        if (!categoriaIdFinal) categoriaIdFinal = await criarCategoriaMaterial('Geral')
      }

      let subcategoriaIdFinal: number | undefined
      if (subcategoriaId === NOVA_SUBCATEGORIA) {
        if (!novaSubcategoriaNome.trim()) {
          setErro('Informe o nome da nova subcategoria')
          return
        }
        subcategoriaIdFinal = await criarCategoriaMaterial(novaSubcategoriaNome.trim(), categoriaIdFinal)
      } else if (subcategoriaId) {
        subcategoriaIdFinal = Number(subcategoriaId)
      }

      if (materialEmEdicaoId !== null) {
        const { quantidadeEstoque: _omit, ...dadosSemEstoque } = resultado.data
        await atualizarMaterial(materialEmEdicaoId, {
          ...dadosSemEstoque,
          categoriaId: categoriaIdFinal,
          subcategoriaId: subcategoriaIdFinal,
        })
      } else {
        await criarMaterial({
          ...resultado.data,
          categoriaId: categoriaIdFinal,
          subcategoriaId: subcategoriaIdFinal,
        })
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
    const valorProdutos = Number(compraValorTotal) || 0
    const valorFrete = Number(compraValorFrete) || 0
    const valorTotal = valorProdutos + valorFrete

    if (!Number.isFinite(qtd) || qtd <= 0) {
      setErroCompra('Informe uma quantidade comprada v├ílida e maior que zero.')
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
          setErroCompra('Informe o nome do novo material rec├®m-comprado.')
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
          catIdFinal = categorias.find((c) => !c.categoriaPaiId)?.id ?? (await criarCategoriaMaterial('Geral'))
        }

        let subcatIdFinal: number | undefined
        if (compraNovoSubcategoriaId === NOVA_SUBCATEGORIA) {
          if (!compraNovaSubcategoriaNome.trim()) {
            setErroCompra('Informe o nome da nova subcategoria.')
            return
          }
          subcatIdFinal = await criarCategoriaMaterial(compraNovaSubcategoriaNome.trim(), catIdFinal)
        } else if (compraNovoSubcategoriaId) {
          subcatIdFinal = Number(compraNovoSubcategoriaId)
        }

        await registrarCompraMaterial({
          novoMaterial: {
            nome: compraNovoNome.trim(),
            categoriaId: catIdFinal,
            subcategoriaId: subcatIdFinal,
            unidade: unidadeFinal,
            quantidadeEstoque: 0,
            custoUnitario: novoCustoUnitarioCalculado,
            valorFrete: valorFrete > 0 ? valorFrete : undefined,
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
    mostrarToast('Material exclu├¡do com sucesso')
    setMaterialExcluindoId(null)
    await recarregar()
  }

  function nomeCategoria(categoriaId: number, subcategoriaId?: number): string {
    const catPai = categorias.find((categoria) => categoria.id === categoriaId)
    const subcat = subcategoriaId ? categorias.find((categoria) => categoria.id === subcategoriaId) : null
    if (catPai && subcat) return `${catPai.nome} > ${subcat.nome}`
    return catPai?.nome ?? 'Sem categoria'
  }

  const categoriasPrincipais = categorias.filter((c) => !c.categoriaPaiId)
  const subcategoriasDisponiveis = categorias.filter((c) => c.categoriaPaiId === Number(categoriaId))
  const compraSubcategoriasDisponiveis = categorias.filter((c) => c.categoriaPaiId === Number(compraNovoCategoriaId))

  const materialSelecionadoCompra = materiais.find((m) => String(m.id) === compraMaterialId)
  const valorTotalEstoque = materiais.reduce((acc, m) => acc + m.quantidadeEstoque * m.custoUnitario, 0)
  const itensEstoqueBaixo = materiais.filter((m) => m.quantidadeEstoque <= 0).length

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-on-surface">Materiais & Insumos</h1>
        <p className="text-label-sm text-on-surface-variant">
          Controle de estoque, compras e custos unit├írios do ateli├¬.
        </p>
      </div>

      <Tabs
        abaAtiva={abaAtiva}
        onMudarAba={setAbaAtiva}
        abas={[
          {
            id: 'estoque',
            rotulo: '­ƒôª Estoque Atual',
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
                    {materialEmEdicaoId !== null ? 'Editar material' : 'Novo material (cadastro b├ísico)'}
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

                    <div>
                      <TextField
                        id="quantidade-material"
                        rotulo={
                          materialEmEdicaoId !== null
                            ? 'Quantidade em estoque'
                            : 'Quantidade a acrescentar ao estoque (entrada inicial)'
                        }
                        type="number"
                        value={quantidadeEstoque}
                        onChange={(e) => setQuantidadeEstoque(e.target.value)}
                        disabled={materialEmEdicaoId !== null}
                      />
                      <p className="mt-1 text-xs text-on-surface-variant flex items-center gap-1">
                        <span>{materialEmEdicaoId !== null ? '­ƒôª' : '­ƒÆí'}</span>
                        {materialEmEdicaoId !== null ? (
                          <span>
                            <strong>Quantidade atual cadastrada em estoque:</strong> {quantidadeEstoque || 0}{' '}
                            {unidadeSelecao === '__outra__' ? unidadeCustom || 'unidade' : unidadeSelecao}. (Para repor ou dar
                            entrada em novas compras, utilize a aba "­ƒøÆ Registrar Compra / Reposi├º├úo").
                          </span>
                        ) : (
                          <span>
                            <strong>Estoque a entrar:</strong> {quantidadeEstoque ? quantidadeEstoque : '0'}{' '}
                            {unidadeSelecao === '__outra__' ? unidadeCustom || 'unidade' : unidadeSelecao}. Esta ├® a quantidade
                            f├¡sica inicial que voc├¬ est├í acrescentando para este material.
                          </span>
                        )}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <TextField
                        id="custo-material"
                        rotulo="Custo unit├írio (R$)"
                        type="number"
                        step="0.001"
                        value={custoUnitario}
                        onChange={(e) => setCustoUnitario(e.target.value)}
                      />
                      <TextField
                        id="frete-material"
                        rotulo="Valor do Frete / Taxa de Envio (R$ - opcional)"
                        type="number"
                        step="0.01"
                        placeholder="Ex: 15.00"
                        value={valorFrete}
                        onChange={(e) => setValorFrete(e.target.value)}
                      />
                    </div>

                    {Number(valorFrete) > 0 && Number(quantidadeEstoque) > 0 && Number(custoUnitario) >= 0 && (
                      <div className="rounded-lg bg-primary/10 border border-primary/20 p-2.5 text-xs text-on-surface">
                        <p className="font-semibold text-primary">
                          ­ƒÆí Resumo de Frete Rateado no Custo:
                        </p>
                        <p className="mt-0.5">
                          Base: {formatarMoeda(Number(custoUnitario))}/{unidadeSelecao} + Frete Rateado: +{formatarMoeda(Number(valorFrete) / Number(quantidadeEstoque))}/{unidadeSelecao} = <strong>Custo Unit├írio Efetivo: {formatarMoeda(Number(custoUnitario) + (Number(valorFrete) / Number(quantidadeEstoque)))}/{unidadeSelecao}</strong>
                        </p>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1">
                        <label htmlFor="categoria-material" className="text-sm font-medium text-on-surface">
                          Categoria Principal
                        </label>
                        <select
                          id="categoria-material"
                          value={categoriaId}
                          onChange={(e) => {
                            setCategoriaId(e.target.value)
                            setSubcategoriaId('')
                          }}
                          className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                        >
                          <option value="">Selecione a categoria</option>
                          {categoriasPrincipais.map((categoria) => (
                            <option key={categoria.id} value={categoria.id}>
                              {categoria.nome}
                            </option>
                          ))}
                          <option value={NOVA_CATEGORIA}>+ Nova categoria principal</option>
                        </select>
                      </div>

                      <div className="flex flex-col gap-1">
                        <label htmlFor="subcategoria-material" className="text-sm font-medium text-on-surface">
                          Subcategoria (opcional)
                        </label>
                        <select
                          id="subcategoria-material"
                          value={subcategoriaId}
                          onChange={(e) => setSubcategoriaId(e.target.value)}
                          disabled={!categoriaId || categoriaId === NOVA_CATEGORIA}
                          className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:opacity-50"
                        >
                          <option value="">Nenhuma / Geral</option>
                          {subcategoriasDisponiveis.map((sub) => (
                            <option key={sub.id} value={sub.id}>
                              {sub.nome}
                            </option>
                          ))}
                          {categoriaId && categoriaId !== NOVA_CATEGORIA && (
                            <option value={NOVA_SUBCATEGORIA}>+ Nova subcategoria</option>
                          )}
                        </select>
                      </div>
                    </div>

                    {categoriaId === NOVA_CATEGORIA && (
                      <TextField
                        id="nova-categoria-material"
                        rotulo="Nome da nova categoria principal"
                        value={novaCategoriaNome}
                        onChange={(e) => setNovaCategoriaNome(e.target.value)}
                      />
                    )}

                    {subcategoriaId === NOVA_SUBCATEGORIA && (
                      <TextField
                        id="nova-subcategoria-material"
                        rotulo="Nome da nova subcategoria"
                        value={novaSubcategoriaNome}
                        onChange={(e) => setNovaSubcategoriaNome(e.target.value)}
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
                          Cancelar edi├º├úo
                        </Button>
                      )}
                    </div>
                  </form>
                </Card>

                <section>
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-on-surface">Todos os Materiais em Estoque</h2>
                    <Button variante="primary" onClick={() => setAbaAtiva('compra')}>
                      ­ƒøÆ Registrar Nova Compra
                    </Button>
                  </div>
                  {materiais.length === 0 ? (
                    <EmptyState
                      titulo="Nenhum material cadastrado"
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
                                  {material.quantidadeEstoque} {material.unidade} em estoque ┬À Custo: {formatarMoeda(material.custoUnitario)}/{material.unidade} {material.valorFrete !== undefined && material.valorFrete > 0 ? `(Frete: ${formatarMoeda(material.valorFrete)})` : ''} ┬À Total: {formatarMoeda(totalItem)} ┬À Categoria: {nomeCategoria(material.categoriaId, material.subcategoriaId)}
                                </p>
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                <Button
                                  variante="ghost"
                                  onClick={() => material.id !== undefined && iniciarCompraParaMaterial(material.id)}
                                >
                                  ­ƒøÆ Repor Estoque
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
            rotulo: '­ƒøÆ Registrar Compra / Reposi├º├úo',
            conteudo: (
              <Card>
                <div className="mb-4">
                  <h2 className="text-lg font-semibold text-on-surface">Entrada de Produtos Rec├®m-Comprados</h2>
                  <p className="mt-1 text-sm text-on-surface-variant">
                    Registre a compra de novos insumos para repor estoque, recalcular custo unit├írio e lan├ºar a despesa
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
                            {mat.nome} ({mat.quantidadeEstoque} {mat.unidade} atual ┬À Custo: {formatarMoeda(mat.custoUnitario)}/{mat.unidade})
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

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                          <label htmlFor="compra-novo-categoria" className="text-sm font-medium text-on-surface">
                            Categoria Principal
                          </label>
                          <select
                            id="compra-novo-categoria"
                            value={compraNovoCategoriaId}
                            onChange={(e) => {
                              setCompraNovoCategoriaId(e.target.value)
                              setCompraNovoSubcategoriaId('')
                            }}
                            className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                          >
                            <option value="">Selecione a categoria</option>
                            {categoriasPrincipais.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.nome}
                              </option>
                            ))}
                            <option value={NOVA_CATEGORIA}>+ Nova categoria principal</option>
                          </select>
                        </div>

                        <div className="flex flex-col gap-1">
                          <label htmlFor="compra-novo-subcategoria" className="text-sm font-medium text-on-surface">
                            Subcategoria (opcional)
                          </label>
                          <select
                            id="compra-novo-subcategoria"
                            value={compraNovoSubcategoriaId}
                            onChange={(e) => setCompraNovoSubcategoriaId(e.target.value)}
                            disabled={!compraNovoCategoriaId || compraNovoCategoriaId === NOVA_CATEGORIA}
                            className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:opacity-50"
                          >
                            <option value="">Nenhuma / Geral</option>
                            {compraSubcategoriasDisponiveis.map((sub) => (
                              <option key={sub.id} value={sub.id}>
                                {sub.nome}
                              </option>
                            ))}
                            {compraNovoCategoriaId && compraNovoCategoriaId !== NOVA_CATEGORIA && (
                              <option value={NOVA_SUBCATEGORIA}>+ Nova subcategoria</option>
                            )}
                          </select>
                        </div>
                      </div>

                      {compraNovoCategoriaId === NOVA_CATEGORIA && (
                        <TextField
                          id="compra-nova-categoria-nome"
                          rotulo="Nome da nova categoria principal"
                          value={compraNovaCategoriaNome}
                          onChange={(e) => setCompraNovaCategoriaNome(e.target.value)}
                        />
                      )}

                      {compraNovoSubcategoriaId === NOVA_SUBCATEGORIA && (
                        <TextField
                          id="compra-nova-subcategoria-nome"
                          rotulo="Nome da nova subcategoria"
                          value={compraNovaSubcategoriaNome}
                          onChange={(e) => setCompraNovaSubcategoriaNome(e.target.value)}
                        />
                      )}
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
                          <span>­ƒôª</span>
                          <span>
                            <strong>Estoque atual cadastrado:</strong> {materialSelecionadoCompra.quantidadeEstoque}{' '}
                            {materialSelecionadoCompra.unidade}. A quantidade comprada ({compraQtd || 0}) ser├í{' '}
                            <strong>somada</strong> ao estoque atual (Novo total previsto:{' '}
                            {materialSelecionadoCompra.quantidadeEstoque + (Number(compraQtd) || 0)}{' '}
                            {materialSelecionadoCompra.unidade}).
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
                        Custo Unit├írio desta compra (com frete):{' '}
                        {formatarMoeda((Number(compraValorTotal) + Number(compraValorFrete || 0)) / Number(compraQtd))}/{' '}
                        {materialSelecionadoCompra
                          ? materialSelecionadoCompra.unidade
                          : compraNovoUnidadeSelecao === '__outra__'
                            ? compraNovoUnidadeCustom || 'un'
                            : compraNovoUnidadeSelecao}
                      </p>
                      {Number(compraValorFrete) > 0 && (
                        <p className="mt-0.5 text-xs text-on-surface-variant">
                          Produtos: {formatarMoeda(Number(compraValorTotal))} + Frete: {formatarMoeda(Number(compraValorFrete))} = Total Pago no Caixa: {formatarMoeda(Number(compraValorTotal) + Number(compraValorFrete))}
                        </p>
                      )}
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
                      Atualizar o custo unit├írio do cadastro para o custo desta nova compra
                    </label>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label htmlFor="compra-conta" className="text-sm font-medium text-on-surface">
                        Lan├ºar Despesa no Financeiro
                      </label>
                      <select
                        id="compra-conta"
                        value={compraContaId}
                        onChange={(e) => setCompraContaId(e.target.value)}
                        className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                      >
                        <option value="">N├úo lan├ºar no financeiro</option>
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
        descricao="Isso n├úo afeta pe├ºas j├í criadas com este material."
        onConfirmar={() => materialExcluindoId !== null && handleExcluir(materialExcluindoId)}
        onCancelar={() => setMaterialExcluindoId(null)}
      />
    </div>
  )
}

