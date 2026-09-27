import { useEffect, useMemo, useRef, useState } from 'react'
import { Card } from '../../components/ui/Card'
import { TextField } from '../../components/ui/TextField'
import { Button } from '../../components/ui/Button'
import { useToast } from '../../components/ui/useToast'
import { db, type Equipamento, type Material } from '../../db/schema'
import { calcularPrecificacao, type UsoEnergiaItem } from '../pricing/pricing'
import { listarPecas, listarConsumosDaPeca, atualizarPrecoVendaPeca, type PecaComForma } from '../producao/pecasRepo'
import { listarMateriais } from '../producao/materiaisRepo'
import { obterTarifasConfig } from '../pricing/tarifasConfigRepo'

function formatarMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export interface InsumoGraficoEmbalagem {
  id: string
  materialId: number
  nome: string
  quantidade: number
  custoUnitario: number
}

export function PrecificacaoPage() {
  const { mostrarToast } = useToast()
  const montado = useRef(true)
  const [pecas, setPecas] = useState<PecaComForma[]>([])
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([])
  const [materiaisEstoque, setMateriaisEstoque] = useState<Material[]>([])
  const [pecaSelecionadaId, setPecaSelecionadaId] = useState('')

  // Custos Diretos
  const [custoMaterial, setCustoMaterial] = useState('')
  const [custoAcessorios, setCustoAcessorios] = useState('')
  const [custoEmbalagem, setCustoEmbalagem] = useState('')
  const [custoForma, setCustoForma] = useState('')
  const [percentualDesperdicio, setPercentualDesperdicio] = useState('0')

  // Insumos de Estoque (Etiquetas, Embalagens, Papéis, Tintas)
  const [insumosGraficos, setInsumosGraficos] = useState<InsumoGraficoEmbalagem[]>([])
  const [materialInsumoId, setMaterialInsumoId] = useState('')
  const [quantidadeInsumo, setQuantidadeInsumo] = useState('1')

  // Energia Elétrica (Luz)
  const [minutosLuz, setMinutosLuz] = useState('')
  const [tarifaKwh, setTarifaKwh] = useState('0.85')
  const [usosEnergia, setUsosEnergia] = useState<UsoEnergiaItem[]>([])

  // Concessionárias
  const [concessionariaLuz, setConcessionariaLuz] = useState('')
  const [concessionariaAgua, setConcessionariaAgua] = useState('')
  const [statusTarifas, setStatusTarifas] = useState('')

  // Água
  const [litrosAgua, setLitrosAgua] = useState('')
  const [tarifaAguaPorLitro, setTarifaAguaPorLitro] = useState('0.015')

  // Mão de Obra e Custos Fixos
  const [horasProducao, setHorasProducao] = useState('')
  const [valorHora, setValorHora] = useState('')
  const [rateioFixoPercent, setRateioFixoPercent] = useState('')

  // Taxas e Margem
  const [margemLucroPercent, setMargemLucroPercent] = useState('')
  const [percentualTaxas, setPercentualTaxas] = useState('0')
  const [taxaFixa, setTaxaFixa] = useState('0')

  const [carregado, setCarregado] = useState(false)

  useEffect(() => {
    montado.current = true
    Promise.all([
      listarPecas(),
      db.equipamentos.toArray(),
      listarMateriais(),
      obterTarifasConfig(),
    ])
      .then(([listaPecas, listaEquipamentos, listaMateriais, tarifas]) => {
        if (!montado.current) return
        setPecas(listaPecas)
        setEquipamentos(listaEquipamentos)
        setMateriaisEstoque(listaMateriais)

        // Carrega tarifas padrões e concessionárias
        setValorHora(String(tarifas.valorHoraMaoDeObra))
        setTarifaKwh(String(tarifas.tarifaKwh))
        setTarifaAguaPorLitro(String(tarifas.tarifaAguaM3 / 1000))
        setConcessionariaLuz(tarifas.concessionariaLuz || '')
        setConcessionariaAgua(tarifas.concessionariaAgua || '')
        setStatusTarifas(tarifas.statusAtualizacaoTarifas || '')
        setCarregado(true)
      })
      .catch((falha) => {
        if (!montado.current) return
        mostrarToast(falha instanceof Error ? falha.message : 'Erro ao carregar dados de precificação.', 'erro')
        setCarregado(true)
      })
    return () => {
      montado.current = false
    }
  }, [])

  async function handleSelecionarPeca(id: string) {
    setPecaSelecionadaId(id)
    if (!id) {
      setCustoMaterial('')
      setCustoAcessorios('')
      setCustoForma('')
      setUsosEnergia([])
      setHorasProducao('')
      return
    }
    try {
      const pecaTarget = pecas.find((p) => String(p.id) === id)
      const [consumos, materiais, categorias] = await Promise.all([
        listarConsumosDaPeca(Number(id)),
        listarMateriais(),
        db.categoriasMaterial.toArray(),
      ])
      if (!montado.current) return

      let somaMaterial = 0
      let somaAcessorios = 0

      for (const consumo of consumos) {
        const mat = materiais.find((m) => m.id === consumo.materialId)
        const cat = mat ? categorias.find((c) => c.id === mat.categoriaId) : undefined
        const valorItem = consumo.quantidade * (mat?.custoUnitario ?? 0)
        const nomeCat = (cat?.nome || '').toLowerCase()

        if (
          nomeCat.includes('adorno') ||
          nomeCat.includes('decoração') ||
          nomeCat.includes('acessório') ||
          nomeCat.includes('ferragem')
        ) {
          somaAcessorios += valorItem
        } else {
          somaMaterial += valorItem
        }
      }

      setCustoMaterial(somaMaterial.toFixed(2))
      setCustoAcessorios(somaAcessorios > 0 ? somaAcessorios.toFixed(2) : '')

      if (pecaTarget) {
        if (pecaTarget.horasMaoDeObra) {
          setHorasProducao(String(pecaTarget.horasMaoDeObra))
        }
        if (pecaTarget.usosEnergia && pecaTarget.usosEnergia.length > 0) {
          setUsosEnergia(
            pecaTarget.usosEnergia.map((u) => ({
              nomeEquipamento: u.nomeEquipamento,
              potenciaWatts: u.potenciaWatts,
              minutosUso: u.minutosUso,
            })),
          )
        }

        const forma = await db.formas.get(pecaTarget.formaId)
        if (forma && forma.custoFabricacao && forma.vidaUtilUsos && forma.vidaUtilUsos > 0) {
          const amortizacao = (forma.custoFabricacao / forma.vidaUtilUsos).toFixed(2)
          setCustoForma(amortizacao)
        } else {
          setCustoForma('')
        }
      }
    } catch (falha) {
      if (!montado.current) return
      mostrarToast(falha instanceof Error ? falha.message : 'Erro ao carregar dados da peça.', 'erro')
    }
  }

  function handleAdicionarInsumoGrafico() {
    if (!materialInsumoId) return
    const mat = materiaisEstoque.find((m) => String(m.id) === materialInsumoId)
    if (!mat) return

    const qte = Number(quantidadeInsumo) || 1
    const novoItem: InsumoGraficoEmbalagem = {
      id: String(Date.now() + Math.random()),
      materialId: mat.id!,
      nome: mat.nome,
      quantidade: qte,
      custoUnitario: mat.custoUnitario,
    }

    const novaLista = [...insumosGraficos, novoItem]
    setInsumosGraficos(novaLista)

    const soma = novaLista.reduce((acc, item) => acc + item.quantidade * item.custoUnitario, 0)
    setCustoEmbalagem(soma.toFixed(2))
    setMaterialInsumoId('')
    setQuantidadeInsumo('1')
  }

  function handleRemoverInsumoGrafico(idItem: string) {
    const novaLista = insumosGraficos.filter((item) => item.id !== idItem)
    setInsumosGraficos(novaLista)
    const soma = novaLista.reduce((acc, item) => acc + item.quantidade * item.custoUnitario, 0)
    setCustoEmbalagem(soma.toFixed(2))
  }

  function handleAdicionarUsoLuzEquipamento(eqIdStr: string) {
    const eq = equipamentos.find((e) => String(e.id) === eqIdStr)
    const mins = Number(minutosLuz) || 30
    const watts = eq ? eq.potenciaWatts : 1000
    const nome = eq ? eq.nome : `Equipamento (${watts}W)`

    setUsosEnergia((prev) => [
      ...prev,
      {
        nomeEquipamento: nome,
        potenciaWatts: watts,
        minutosUso: mins,
      },
    ])
  }

  function handleRemoverUsoLuz(idx: number) {
    setUsosEnergia((prev) => prev.filter((_, i) => i !== idx))
  }

  const todosVazios = [
    custoMaterial,
    custoAcessorios,
    custoEmbalagem,
    custoForma,
    minutosLuz,
    usosEnergia.length > 0 ? 'sim' : '',
    litrosAgua,
    horasProducao,
    rateioFixoPercent,
    margemLucroPercent,
  ].every((valor) => valor === '')

  const { resultado, erroValidacao } = useMemo(() => {
    try {
      const calculado = calcularPrecificacao({
        custoMaterial: Number(custoMaterial) || 0,
        custoAcessorios: Number(custoAcessorios) || 0,
        custoEmbalagem: Number(custoEmbalagem) || 0,
        custoForma: Number(custoForma) || 0,
        percentualDesperdicio: Number(percentualDesperdicio) || 0,

        // Energia
        custoEnergia: 0,
        usosEnergia: usosEnergia.length > 0 ? usosEnergia : (Number(minutosLuz) > 0 ? [{ potenciaWatts: 1000, minutosUso: Number(minutosLuz) }] : undefined),
        tarifaKwh: Number(tarifaKwh) || 0.85,

        // Água
        custoAgua: 0,
        litrosAgua: Number(litrosAgua) || 0,
        tarifaAguaPorLitro: Number(tarifaAguaPorLitro) || 0.015,

        // Mão de Obra e Custos Fixos
        horasProducao: Number(horasProducao) || 0,
        valorHora: Number(valorHora) || 0,
        rateioFixoPercent: Number(rateioFixoPercent) || 0,

        // Lucro e Taxas
        margemLucroPercent: Number(margemLucroPercent) || 0,
        percentualTaxas: Number(percentualTaxas) || 0,
        taxaFixa: Number(taxaFixa) || 0,
      })
      return { resultado: calculado, erroValidacao: null }
    } catch (falha) {
      return { resultado: null, erroValidacao: falha instanceof Error ? falha.message : 'Dados inválidos.' }
    }
  }, [
    custoMaterial,
    custoAcessorios,
    custoEmbalagem,
    custoForma,
    percentualDesperdicio,
    usosEnergia,
    minutosLuz,
    tarifaKwh,
    litrosAgua,
    tarifaAguaPorLitro,
    horasProducao,
    valorHora,
    rateioFixoPercent,
    margemLucroPercent,
    percentualTaxas,
    taxaFixa,
  ])

  async function handleSalvarPreco() {
    if (!pecaSelecionadaId || !resultado) return
    try {
      await atualizarPrecoVendaPeca(Number(pecaSelecionadaId), resultado.precoFinal)
      mostrarToast('Preço de venda salvo na peça com sucesso!')
    } catch (falha) {
      mostrarToast(falha instanceof Error ? falha.message : 'Erro ao salvar preço de venda.', 'erro')
    }
  }

  if (!carregado) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl font-semibold text-on-surface">Precificação Completa</h1>
        <p className="text-sm text-on-surface-variant">Carregando dados de precificação...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-on-surface">Precificação Completa do Ateliê</h1>
        <p className="text-label-sm text-on-surface-variant">
          Cálculo detalhado de custos de resina, energia elétrica (luz), água, amortização de moldes, mão de obra, taxas e margem de lucro.
        </p>
      </div>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-on-surface">1. Vincular Peça ou Modelo</h2>
        <Card>
          <div className="flex flex-col gap-1">
            <label htmlFor="peca-precificacao" className="text-sm font-medium text-on-surface">
              Peça (opcional)
            </label>
            <select
              id="peca-precificacao"
              value={pecaSelecionadaId}
              onChange={(e) => handleSelecionarPeca(e.target.value)}
              className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            >
              <option value="">Nenhuma (precificação manual livre)</option>
              {pecas.map((peca) => (
                <option key={peca.id} value={peca.id}>
                  {peca.nome} {peca.precoVenda ? `(Atual: ${formatarMoeda(peca.precoVenda)})` : ''}
                </option>
              ))}
            </select>
          </div>
        </Card>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-on-surface">2. Custos Diretos de Matéria-Prima, Moldes & Insumos</h2>
        <Card className="flex flex-col gap-4">
          {pecaSelecionadaId && (
            <p className="text-xs text-primary font-medium bg-primary/10 p-2.5 rounded-lg border border-primary/20">
              ℹ️ Os custos de resina, acessórios, mão de obra e molde/forma foram preenchidos automaticamente a partir dos dados de produção da peça selecionada.
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <TextField
              id="custo-material"
              rotulo="Custo do material / Resina (R$)"
              type="number"
              value={custoMaterial}
              onChange={(e) => setCustoMaterial(e.target.value)}
              readOnly={!!pecaSelecionadaId}
            />
            <TextField
              id="custo-acessorios"
              rotulo="Acessórios (R$)"
              type="number"
              value={custoAcessorios}
              onChange={(e) => setCustoAcessorios(e.target.value)}
              readOnly={!!pecaSelecionadaId}
            />
            <TextField
              id="custo-forma"
              rotulo="Molde / Forma (+ R$ / uso)"
              type="number"
              value={custoForma}
              onChange={(e) => setCustoForma(e.target.value)}
              readOnly={!!pecaSelecionadaId}
            />
            <TextField
              id="custo-embalagem"
              rotulo="Embalagens, Mimos & Gráfica (R$)"
              type="number"
              value={custoEmbalagem}
              onChange={(e) => setCustoEmbalagem(e.target.value)}
            />
            <TextField
              id="percentual-desperdicio"
              rotulo="Desperdício / Sobras de Copo (%)"
              type="number"
              value={percentualDesperdicio}
              onChange={(e) => setPercentualDesperdicio(e.target.value)}
            />
          </div>

          {/* Escolher Caixas e Insumos do Estoque */}
          <div className="flex flex-col gap-3 pt-3 border-t border-outline-variant/50">
            <h3 className="text-xs font-semibold uppercase text-on-surface-variant">
              📦 Caixas & Insumos Cadastrados no Estoque
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
              <div className="flex flex-col gap-1">
                <label htmlFor="select-insumo-estoque" className="text-sm font-medium text-on-surface">
                  Caixa / Embalagem / Insumo
                </label>
                <select
                  id="select-insumo-estoque"
                  value={materialInsumoId}
                  onChange={(e) => setMaterialInsumoId(e.target.value)}
                  className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="">Selecione uma caixa/insumo do estoque...</option>
                  {materiaisEstoque.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nome} ({formatarMoeda(m.custoUnitario)} / {m.unidade})
                    </option>
                  ))}
                </select>
              </div>

              <TextField
                id="qte-insumo-estoque"
                rotulo="Quantidade Usada"
                type="number"
                step="0.1"
                value={quantidadeInsumo}
                onChange={(e) => setQuantidadeInsumo(e.target.value)}
              />

              <Button type="button" onClick={handleAdicionarInsumoGrafico} disabled={!materialInsumoId}>
                + Adicionar ao Custo
              </Button>
            </div>

            {insumosGraficos.length > 0 && (
              <div className="flex flex-col gap-2 pt-2">
                <p className="text-xs font-medium text-on-surface-variant">Caixas/Embalagens adicionadas ao produto:</p>
                {insumosGraficos.map((item) => (
                  <div key={item.id} className="flex items-center justify-between bg-surface p-2 rounded border border-outline-variant/40 text-xs">
                    <span>
                      📌 <strong>{item.nome}</strong> ({item.quantidade}x a {formatarMoeda(item.custoUnitario)} = {formatarMoeda(item.quantidade * item.custoUnitario)})
                    </span>
                    <Button type="button" variante="ghost" className="px-2 py-0.5 text-xs text-error" onClick={() => handleRemoverInsumoGrafico(item.id)}>
                      Remover
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-on-surface">3. Consumo de Utilidades (Energia Elétrica / Luz & Água)</h2>
        <Card className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg border border-primary/20 bg-primary/5 text-xs text-on-surface">
            <div>
              <p className="font-semibold text-primary">
                ⚙️ Tarifas das Configurações: Luz R$ {tarifaKwh}/kWh | Água R$ {(Number(tarifaAguaPorLitro) * 1000).toFixed(2)}/m³ (R$ {tarifaAguaPorLitro}/L)
              </p>
              {(concessionariaLuz || concessionariaAgua) && (
                <p className="text-[11px] text-on-surface-variant mt-0.5">
                  🏬 Concessionárias: {concessionariaLuz || 'Energia'} | {concessionariaAgua || 'Saneamento'} {statusTarifas ? `(${statusTarifas})` : ''}
                </p>
              )}
            </div>
          </div>

          {/* Energia Elétrica (Luz) */}
          <div className="flex flex-col gap-3 rounded-lg border border-outline-variant/60 bg-surface-variant/20 p-3">
            <h3 className="text-sm font-semibold text-on-surface flex items-center gap-1.5">
              ⚡ Energia Elétrica (Ferramentas & Maquinários)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
              <div className="flex flex-col gap-1">
                <label htmlFor="equipamento-select" className="text-sm font-medium text-on-surface">
                  Ferramenta / Equipamento da Caixa
                </label>
                <select
                  id="equipamento-select"
                  defaultValue=""
                  onChange={(e) => {
                    if (e.target.value) {
                      handleAdicionarUsoLuzEquipamento(e.target.value)
                      e.target.value = ''
                    }
                  }}
                  className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="">+ Selecionar ferramenta (Lâmpada, Secador, Soprador, Furadeira, Politriz...)</option>
                  {equipamentos.map((eq) => (
                    <option key={eq.id} value={eq.id}>
                      {eq.nome} ({eq.potenciaWatts}W) {eq.descricao ? `- ${eq.descricao}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <TextField
                id="minutos-luz"
                rotulo="Tempo de Uso (Minutos)"
                type="number"
                placeholder="Ex: 30"
                value={minutosLuz}
                onChange={(e) => setMinutosLuz(e.target.value)}
              />

              <Button
                type="button"
                onClick={() => {
                  if (minutosLuz) {
                    handleAdicionarUsoLuzEquipamento('')
                  }
                }}
              >
                + Adicionar Tempo de Uso
              </Button>
            </div>

            {usosEnergia.length > 0 && (
              <div className="flex flex-col gap-2 pt-2 border-t border-outline-variant/40">
                <p className="text-xs font-medium text-on-surface-variant">Equipamentos e Ferramentas Utilizados:</p>
                {usosEnergia.map((u, idx) => {
                  const custoEst = ((u.potenciaWatts * u.minutosUso) / (1000 * 60)) * (Number(tarifaKwh) || 0.85)
                  return (
                    <div key={idx} className="flex items-center justify-between bg-surface p-2 rounded border border-outline-variant/40 text-xs">
                      <span>⚡ <strong>{u.nomeEquipamento || 'Equipamento'}</strong> ({u.potenciaWatts}W por {u.minutosUso} min) = {formatarMoeda(custoEst)}</span>
                      <Button type="button" variante="ghost" className="px-2 py-0.5 text-xs text-error" onClick={() => handleRemoverUsoLuz(idx)}>
                        Remover
                      </Button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Consumo de Água */}
          <div className="flex flex-col gap-3 rounded-lg border border-outline-variant/60 bg-surface-variant/20 p-3">
            <h3 className="text-sm font-semibold text-on-surface flex items-center gap-1.5">
              💧 Consumo de Água (Lixamento d'água / Lavagem)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <TextField
                id="litros-agua"
                rotulo="Volume de Água Usada (Litros)"
                type="number"
                placeholder="Ex: 15"
                value={litrosAgua}
                onChange={(e) => setLitrosAgua(e.target.value)}
              />
              <div className="flex flex-col justify-center text-xs text-on-surface-variant">
                <p>Calculado automaticamente usando a tarifa das configurações (R$ {tarifaAguaPorLitro}/Litro).</p>
                {Number(litrosAgua) > 0 && (
                  <p className="font-semibold text-primary mt-1">
                    Custo de água estimado: {formatarMoeda((Number(litrosAgua) || 0) * (Number(tarifaAguaPorLitro) || 0.015))}
                  </p>
                )}
              </div>
            </div>
          </div>
        </Card>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-on-surface">4. Mão de Obra, Custo Fixo e Margens</h2>
        <Card>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <TextField id="horas-producao" rotulo="Horas de produção" type="number" step="0.1" value={horasProducao} onChange={(e) => setHorasProducao(e.target.value)} />
            <TextField id="valor-hora" rotulo="Valor da hora (R$)" type="number" value={valorHora} onChange={(e) => setValorHora(e.target.value)} readOnly={true} />
            <TextField id="rateio-fixo" rotulo="Rateio de custo fixo (%)" type="number" value={rateioFixoPercent} onChange={(e) => setRateioFixoPercent(e.target.value)} />
            <TextField id="margem-lucro" rotulo="Margem de lucro (%)" type="number" value={margemLucroPercent} onChange={(e) => setMargemLucroPercent(e.target.value)} />
            <TextField id="percentual-taxas" rotulo="Taxas de Venda / Marketplace (%)" type="number" value={percentualTaxas} onChange={(e) => setPercentualTaxas(e.target.value)} />
            <TextField id="taxa-fixa" rotulo="Taxa Fixa da Plataforma (R$)" type="number" value={taxaFixa} onChange={(e) => setTaxaFixa(e.target.value)} />
          </div>

          {erroValidacao && (
            <p role="alert" className="mt-3 text-sm text-error font-medium">{erroValidacao}</p>
          )}
        </Card>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-on-surface">5. Demonstrativo Financeiro & Preço Recomendado</h2>
        <Card className="border border-primary/40 bg-primary/5">
          {todosVazios ? (
            <p className="text-sm text-on-surface-variant">Preencha os campos para calcular</p>
          ) : resultado ? (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <p className="text-sm text-on-surface-variant">Custo direto: {formatarMoeda(resultado.custoDireto)}</p>
                {resultado.custoEnergia > 0 && (
                  <p className="text-xs text-primary font-medium">⚡ Tempo de Luz / Energia: {formatarMoeda(resultado.custoEnergia)}</p>
                )}
                {resultado.custoAgua > 0 && (
                  <p className="text-xs text-primary font-medium">💧 Consumo de Água: {formatarMoeda(resultado.custoAgua)}</p>
                )}
                {resultado.custoForma > 0 && (
                  <p className="text-xs text-primary font-medium">🧱 Uso do molde de silicone: {formatarMoeda(resultado.custoForma)}</p>
                )}
                <p className="text-sm text-on-surface-variant">Mão de obra: {formatarMoeda(resultado.custoMaoDeObra)}</p>
                <p className="text-sm text-on-surface-variant">Custo fixo: {formatarMoeda(resultado.custoFixo)}</p>
                <p className="text-sm text-on-surface-variant">Lucro: {formatarMoeda(resultado.lucro)}</p>
                <p className="mt-2 text-headline-sm font-semibold text-primary">Preço final: {formatarMoeda(resultado.precoFinal)}</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs text-on-surface">
                <div className="bg-surface p-2.5 rounded border border-outline-variant/40">
                  <span className="text-on-surface-variant">Resina & Materiais:</span>
                  <p className="font-bold text-sm text-on-surface">{formatarMoeda(resultado.custoMaterial)}</p>
                  {resultado.custoDesperdicio > 0 && (
                    <span className="text-[10px] text-on-surface-variant">+ {formatarMoeda(resultado.custoDesperdicio)} desperdício</span>
                  )}
                </div>

                <div className="bg-surface p-2.5 rounded border border-outline-variant/40">
                  <span className="text-on-surface-variant">Acessórios & Embalagem:</span>
                  <p className="font-bold text-sm text-on-surface">{formatarMoeda(resultado.custoAcessorios + resultado.custoEmbalagem)}</p>
                </div>

                <div className="bg-surface p-2.5 rounded border border-outline-variant/40">
                  <span className="text-on-surface-variant">⚡ Energia Elétrica (Luz):</span>
                  <p className="font-bold text-sm text-primary">{formatarMoeda(resultado.custoEnergia)}</p>
                </div>

                <div className="bg-surface p-2.5 rounded border border-outline-variant/40">
                  <span className="text-on-surface-variant">💧 Consumo de Água:</span>
                  <p className="font-bold text-sm text-primary">{formatarMoeda(resultado.custoAgua)}</p>
                </div>

                <div className="bg-surface p-2.5 rounded border border-outline-variant/40">
                  <span className="text-on-surface-variant">🧱 Molde / Forma:</span>
                  <p className="font-bold text-sm text-on-surface">{formatarMoeda(resultado.custoForma)}</p>
                </div>

                <div className="bg-surface p-2.5 rounded border border-outline-variant/40">
                  <span className="text-on-surface-variant">⏱️ Mão de Obra Artesanal:</span>
                  <p className="font-bold text-sm text-on-surface">{formatarMoeda(resultado.custoMaoDeObra)}</p>
                </div>

                <div className="bg-surface p-2.5 rounded border border-outline-variant/40">
                  <span className="text-on-surface-variant">🏢 Rateio de Custo Fixo:</span>
                  <p className="font-bold text-sm text-on-surface">{formatarMoeda(resultado.custoFixo)}</p>
                </div>

                <div className="bg-surface p-2.5 rounded border border-outline-variant/40">
                  <span className="text-on-surface-variant">📊 Lucro Líquido Real:</span>
                  <p className="font-bold text-sm text-success">{formatarMoeda(resultado.lucro)}</p>
                </div>

                {resultado.taxaMarketplace > 0 && (
                  <div className="bg-surface p-2.5 rounded border border-outline-variant/40">
                    <span className="text-on-surface-variant">🛍️ Taxas de Venda/Plataforma:</span>
                    <p className="font-bold text-sm text-error">{formatarMoeda(resultado.taxaMarketplace)}</p>
                  </div>
                )}
              </div>

              <div className="mt-2 pt-3 border-t border-primary/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <p className="text-xs text-on-surface-variant uppercase font-medium">Preço Ideal Sugerido de Venda</p>
                  <p className="text-3xl font-extrabold text-primary">{formatarMoeda(resultado.precoFinal)}</p>
                  <p className="text-xs text-on-surface-variant">
                    Custo Total: {formatarMoeda(resultado.custoTotal)} · Lucro: {formatarMoeda(resultado.lucro)}
                  </p>
                </div>

                {pecaSelecionadaId && (
                  <Button onClick={handleSalvarPreco}>
                    Salvar {formatarMoeda(resultado.precoFinal)} como Preço de Venda da Peça
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <p className="text-headline-sm font-semibold text-on-surface">Preço final: —</p>
          )}
        </Card>
      </section>
    </div>
  )
}
