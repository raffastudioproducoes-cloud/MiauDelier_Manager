import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { z } from 'zod'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { TextField } from '../../components/ui/TextField'
import { Badge } from '../../components/ui/Badge'
import { EmptyState } from '../../components/ui/EmptyState'
import { ConfirmModal } from '../../components/ui/ConfirmModal'
import { useToast } from '../../components/ui/useToast'
import { criarPeca, listarPecas, excluirPeca, type PecaComForma } from './pecasRepo'
import { listarFormas } from './formasRepo'
import { listarMateriais } from './materiaisRepo'
import type { Forma, Material } from '../../db/schema'
import { converterQuantidade, obterOpcoesUnidadeCompativeis } from '../../lib/unidades'

const schemaPeca = z.object({
  nome: z.string().trim().min(1, 'Informe o nome da peça').max(120),
})

interface LinhaConsumo {
  materialId: string
  quantidade: string
  unidade: string
}

function linhaVazia(): LinhaConsumo {
  return { materialId: '', quantidade: '', unidade: '' }
}

export function PecasPage() {
  const { mostrarToast } = useToast()
  const [pecas, setPecas] = useState<PecaComForma[]>([])
  const [formas, setFormas] = useState<Forma[]>([])
  const [materiais, setMateriais] = useState<Material[]>([])
  const [nome, setNome] = useState('')
  const [formaId, setFormaId] = useState('')
  const [consumos, setConsumos] = useState<LinhaConsumo[]>([linhaVazia()])
  const [erro, setErro] = useState<string | null>(null)
  const [pecaExcluindoId, setPecaExcluindoId] = useState<number | null>(null)
  const [carregado, setCarregado] = useState(false)

  const montado = useRef(true)

  async function recarregar() {
    const [pecasCarregadas, formasCarregadas, materiaisCarregados] = await Promise.all([
      listarPecas(),
      listarFormas(),
      listarMateriais(),
    ])
    if (!montado.current) return
    setPecas(pecasCarregadas)
    setFormas(formasCarregadas)
    setMateriais(materiaisCarregados)
  }

  useEffect(() => {
    montado.current = true
    recarregar()
      .then(() => {
        if (!montado.current) return
        setCarregado(true)
      })
      .catch((falha) => {
        if (!montado.current) return
        mostrarToast(falha instanceof Error ? falha.message : 'Erro ao carregar peças.', 'erro')
        setCarregado(true)
      })
    return () => {
      montado.current = false
    }
  }, [])

  function limparFormulario() {
    setNome('')
    setFormaId('')
    setConsumos([linhaVazia()])
    setErro(null)
  }

  function atualizarLinha(indice: number, campo: keyof LinhaConsumo, valor: string) {
    setConsumos((atual) => atual.map((linha, i) => (i === indice ? { ...linha, [campo]: valor } : linha)))
  }

  function selecionarMaterialNaLinha(indice: number, materialIdStr: string) {
    const mat = materiais.find((m) => m.id === Number(materialIdStr))
    setConsumos((atual) =>
      atual.map((linha, i) =>
        i === indice
          ? {
              ...linha,
              materialId: materialIdStr,
              unidade: mat ? mat.unidade : '',
            }
          : linha,
      ),
    )
  }

  function adicionarLinha() {
    setConsumos((atual) => [...atual, linhaVazia()])
  }

  function removerLinha(indice: number) {
    setConsumos((atual) => atual.filter((_, i) => i !== indice))
  }

  async function handleSubmit(evento: React.FormEvent) {
    evento.preventDefault()
    setErro(null)

    const resultado = schemaPeca.safeParse({ nome })
    if (!resultado.success) {
      setErro(resultado.error.issues[0]?.message ?? 'Dados inválidos')
      return
    }
    if (!formaId) {
      setErro('Selecione uma forma')
      return
    }

    const linhasValidas = consumos.filter((linha) => linha.materialId && Number(linha.quantidade) > 0)
    if (linhasValidas.length === 0) {
      setErro('Adicione ao menos um material com quantidade maior que zero')
      return
    }

    try {
      await criarPeca({
        nome: resultado.data.nome,
        formaId: Number(formaId),
        consumos: linhasValidas.map((linha) => ({
          materialId: Number(linha.materialId),
          quantidade: Number(linha.quantidade),
          unidade: linha.unidade || undefined,
        })),
      })
    } catch (falha) {
      if (!montado.current) return
      mostrarToast(falha instanceof Error ? falha.message : 'Erro ao salvar.', 'erro')
      return
    }
    if (!montado.current) return
    mostrarToast('Peça cadastrada com sucesso')
    limparFormulario()
    await recarregar()
  }

  async function handleExcluir(pecaId: number) {
    try {
      await excluirPeca(pecaId)
    } catch (falha) {
      if (!montado.current) return
      mostrarToast(falha instanceof Error ? falha.message : 'Erro ao excluir peça.', 'erro')
      return
    }
    if (!montado.current) return
    mostrarToast('Peça excluída com sucesso')
    setPecaExcluindoId(null)
    await recarregar()
  }

  const formasProntas = useMemo(() => {
    return formas.filter((f) => f.status === undefined || f.status === 'pronta')
  }, [formas])

  const materiaisConsumiveisPeca = useMemo(() => {
    return materiais.filter((m) => {
      const nomeUpper = m.nome.toUpperCase()
      // Oculta silicone do consumo direto da mesa (o silicone é consumido ao fabricar a forma/molde)
      if (nomeUpper.includes('SILICONE') || nomeUpper.includes('BORRACHA DE SILICONE')) {
        return false
      }
      return true
    })
  }, [materiais])

  const faltamPreRequisitos = formasProntas.length === 0 || materiaisConsumiveisPeca.length === 0

  if (!carregado) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl font-semibold text-on-surface">Peças</h1>
        <p className="text-sm text-on-surface-variant">Carregando...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-on-surface">Peças</h1>
        <p className="text-label-sm text-on-surface-variant">Fluxo das peças na oficina.</p>
      </div>

      <Card>
        <h2 className="mb-3 font-medium text-on-surface">Cadastrar peça</h2>
        {faltamPreRequisitos && (
          <p role="alert" className="mb-3 text-sm text-on-surface-variant">
            Cadastre pelo menos um material e uma forma antes de criar uma peça.
          </p>
        )}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <TextField id="nome-peca" rotulo="Nome da peça" value={nome} onChange={(e) => setNome(e.target.value)} />

          <div className="flex flex-col gap-1">
            <label htmlFor="forma-peca" className="text-sm font-medium text-on-surface">Forma</label>
            <select
              id="forma-peca"
              value={formaId}
              onChange={(e) => setFormaId(e.target.value)}
              className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            >
              <option value="">Selecione o molde...</option>
              {formasProntas.map((forma) => (
                <option key={forma.id} value={String(forma.id)}>
                  {forma.nome} {forma.custoFabricacao && forma.vidaUtilUsos ? `(Amortização: R$ ${(forma.custoFabricacao / forma.vidaUtilUsos).toFixed(2)}/uso)` : ''}
                </option>
              ))}
            </select>
          </div>

          <p className="text-sm font-medium text-on-surface">Materiais consumidos (Resina, Pigmentos, Adornos)</p>
          {consumos.map((linha, indice) => {
            const matSelecionado = materiaisConsumiveisPeca.find((m) => m.id === Number(linha.materialId))
            const opcoesUnidade = matSelecionado ? obterOpcoesUnidadeCompativeis(matSelecionado.unidade) : ['un']
            const unidadeLinha = linha.unidade || (matSelecionado?.unidade ?? '')

            const qtdNum = Number(linha.quantidade) || 0
            const temCalculo = matSelecionado && qtdNum > 0
            const { quantidadeConvertida } = temCalculo
              ? converterQuantidade(qtdNum, unidadeLinha, matSelecionado.unidade)
              : { quantidadeConvertida: 0 }
            const restante = matSelecionado ? matSelecionado.quantidadeEstoque - quantidadeConvertida : 0
            const ehInsuficiente = temCalculo && restante < 0

            return (
              <div key={indice} className="flex flex-col gap-2 rounded-xl border border-outline-variant/60 bg-surface-container/30 p-3">
                <div className="flex flex-wrap items-end gap-2">
                  <div className="flex flex-1 min-w-[200px] flex-col gap-1">
                    <label htmlFor={`material-peca-${indice}`} className="text-sm font-medium text-on-surface">Material</label>
                    <select
                      id={`material-peca-${indice}`}
                      value={linha.materialId}
                      onChange={(e) => selecionarMaterialNaLinha(indice, e.target.value)}
                      className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                    >
                      <option value="">Selecione o insumo...</option>
                      {materiaisConsumiveisPeca.map((material) => (
                        <option key={material.id} value={String(material.id)}>
                          {material.nome} ({material.quantidadeEstoque} {material.unidade} em estoque)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="w-32">
                    <TextField
                      id={`quantidade-peca-${indice}`}
                      rotulo="Quantidade"
                      type="number"
                      step="0.001"
                      value={linha.quantidade}
                      onChange={(e) => atualizarLinha(indice, 'quantidade', e.target.value)}
                    />
                  </div>

                  <div className="flex flex-col gap-1 w-28">
                    <label htmlFor={`unidade-peca-${indice}`} className="text-sm font-medium text-on-surface">Unidade</label>
                    <select
                      id={`unidade-peca-${indice}`}
                      value={unidadeLinha}
                      onChange={(e) => atualizarLinha(indice, 'unidade', e.target.value)}
                      className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                    >
                      {opcoesUnidade.map((u) => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                  </div>

                  {consumos.length > 1 && (
                    <Button type="button" variante="ghost" onClick={() => removerLinha(indice)} className="mb-0.5">×</Button>
                  )}
                </div>

                {temCalculo && matSelecionado && (
                  <p className={`text-xs ${ehInsuficiente ? 'text-error font-medium' : 'text-on-surface-variant'}`}>
                    {unidadeLinha !== matSelecionado.unidade
                      ? `Equivale a ${quantidadeConvertida.toFixed(3)} ${matSelecionado.unidade} do estoque. `
                      : ''}
                    {ehInsuficiente ? (
                      <span>⚠️ Estoque insuficiente! Disponível: {matSelecionado.quantidadeEstoque} {matSelecionado.unidade}, Solicitado: {quantidadeConvertida.toFixed(3)} {matSelecionado.unidade}</span>
                    ) : (
                      <span>Estoque após consumo: <strong>{restante.toFixed(3)} {matSelecionado.unidade}</strong></span>
                    )}
                  </p>
                )}
              </div>
            )
          })}
          <Button type="button" variante="ghost" onClick={adicionarLinha}>+ Adicionar material</Button>

          {erro && <p role="alert" className="text-sm text-error">{erro}</p>}
          <Button type="submit" disabled={faltamPreRequisitos}>Cadastrar peça</Button>
        </form>
      </Card>

      <section>
        <h2 className="mb-4 text-sm font-semibold text-on-surface">Todas as Peças</h2>
        {pecas.length === 0 ? (
          <EmptyState titulo="Nenhuma peça cadastrada" descricao="Cadastre a primeira peça em produção." />
        ) : (
          <div className="relative pl-6 sm:pl-32 flex flex-col gap-5 before:absolute before:left-2.5 sm:before:left-[108px] before:top-3 before:bottom-3 before:w-[2px] before:bg-outline-variant/40 before:border-r before:border-dashed before:border-outline-variant/60">
            {pecas.map((peca) => {
              const statusStr = peca.status || 'pronta'
              const statusFormatado = statusStr.toUpperCase().replace('_', ' ')
              const statusVariant =
                statusStr === 'vendida'
                  ? 'success'
                  : statusStr === 'cancelada'
                  ? 'danger'
                  : statusStr === 'curando'
                  ? 'warning'
                  : 'neutral'

              return (
                <div key={peca.id} className="relative flex flex-col sm:flex-row items-start gap-4">
                  {/* Rótulo Esquerda (Desktop) */}
                  <div className="hidden sm:flex flex-col items-end w-24 shrink-0 pt-1 text-right">
                    <span className="text-xs font-semibold text-on-surface uppercase tracking-wider">
                      PEÇA
                    </span>
                    <span className="text-[11px] text-on-surface-variant font-mono">
                      #{peca.id}
                    </span>
                  </div>

                  {/* Marcador Central (Node Dot) */}
                  <div className="absolute -left-6 sm:static sm:left-auto pt-1 shrink-0 z-10">
                    <div className="h-5 w-5 rounded-full border-2 border-primary bg-primary/20 text-primary flex items-center justify-center shadow-sm">
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    </div>
                  </div>

                  {/* Card de Conteúdo à Direita */}
                  <Card className="flex-1 w-full glow-hover flex flex-col gap-2">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-outline-variant/30 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="sm:hidden text-xs font-semibold uppercase text-on-surface">
                          PEÇA #{peca.id}
                        </span>
                        <Badge variant={statusVariant} className="uppercase font-bold tracking-wider text-[10px] px-2.5 py-0.5">
                          {statusFormatado}
                        </Badge>
                      </div>
                      {peca.precoVenda !== undefined && peca.precoVenda > 0 && (
                        <span className="text-xs font-mono font-semibold text-primary">
                          Preço: R$ {peca.precoVenda.toFixed(2)}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary text-base font-semibold">
                          🧩
                        </div>
                        <div className="flex flex-col min-w-0">
                          <Link to="/pecas/$pecaId" params={{ pecaId: String(peca.id) }} className="hover:underline font-semibold text-on-surface text-base truncate">
                            {peca.nome}
                          </Link>
                          {peca.nomeForma && (
                            <p className="text-xs text-on-surface-variant flex items-center gap-1.5 mt-0.5">
                              <span className="text-[10px] font-medium bg-surface-container-high/40 px-2 py-0.5 rounded border border-outline-variant/40">
                                Molde: {peca.nomeForma}
                              </span>
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Link to="/pecas/$pecaId" params={{ pecaId: String(peca.id) }}>
                          <Button variante="ghost" className="text-xs">
                            Detalhes →
                          </Button>
                        </Link>
                        <Button variante="ghost" className="text-xs text-error hover:bg-error/10" onClick={() => setPecaExcluindoId(peca.id ?? null)}>
                          Excluir
                        </Button>
                      </div>
                    </div>
                  </Card>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <ConfirmModal
        aberto={pecaExcluindoId !== null}
        titulo="Excluir peça?"
        descricao="O material consumido volta ao estoque."
        onConfirmar={() => pecaExcluindoId !== null && handleExcluir(pecaExcluindoId)}
        onCancelar={() => setPecaExcluindoId(null)}
      />
    </div>
  )
}
