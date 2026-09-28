import { useEffect, useMemo, useRef, useState } from 'react'
import { Card } from '../../components/ui/Card'
import { TextField } from '../../components/ui/TextField'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { useToast } from '../../components/ui/useToast'
import { db, type CategoriaMaterial, type Equipamento, type Material, type Taxa } from '../../db/schema'
import { calcularPrecificacao, type UsoEnergiaItem } from '../pricing/pricing'
import { listarPecas, listarConsumosDaPeca, atualizarPrecoVendaPeca, type PecaComForma } from '../producao/pecasRepo'
import { listarMateriais } from '../producao/materiaisRepo'
import { obterTarifasConfig, salvarTarifasConfig } from '../pricing/tarifasConfigRepo'
import { sincronizarTarifasConcessionaria } from '../pricing/concessionariasService'
import { listarTaxas } from './taxasRepo'

function formatarMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export const LISTA_PAISES = [
  'Brasil',
  'Portugal',
  'Estados Unidos',
  'Espanha',
  'Argentina',
  'Uruguai',
  'Outro País',
]

export const ESTADOS_BRASIL = [
  { uf: 'AC', nome: 'Acre (AC)' },
  { uf: 'AL', nome: 'Alagoas (AL)' },
  { uf: 'AM', nome: 'Amazonas (AM)' },
  { uf: 'AP', nome: 'Amapá (AP)' },
  { uf: 'BA', nome: 'Bahia (BA)' },
  { uf: 'CE', nome: 'Ceará (CE)' },
  { uf: 'DF', nome: 'Distrito Federal (DF)' },
  { uf: 'ES', nome: 'Espírito Santo (ES)' },
  { uf: 'GO', nome: 'Goiás (GO)' },
  { uf: 'MA', nome: 'Maranhão (MA)' },
  { uf: 'MG', nome: 'Minas Gerais (MG)' },
  { uf: 'MS', nome: 'Mato Grosso do Sul (MS)' },
  { uf: 'MT', nome: 'Mato Grosso (MT)' },
  { uf: 'PA', nome: 'Pará (PA)' },
  { uf: 'PB', nome: 'Paraíba (PB)' },
  { uf: 'PE', nome: 'Pernambuco (PE)' },
  { uf: 'PI', nome: 'Piauí (PI)' },
  { uf: 'PR', nome: 'Paraná (PR)' },
  { uf: 'RJ', nome: 'Rio de Janeiro (RJ)' },
  { uf: 'RN', nome: 'Rio Grande do Norte (RN)' },
  { uf: 'RO', nome: 'Rondônia (RO)' },
  { uf: 'RR', nome: 'Roraima (RR)' },
  { uf: 'RS', nome: 'Rio Grande do Sul (RS)' },
  { uf: 'SC', nome: 'Santa Catarina (SC)' },
  { uf: 'SE', nome: 'Sergipe (SE)' },
  { uf: 'SP', nome: 'São Paulo (SP)' },
  { uf: 'TO', nome: 'Tocantins (TO)' },
]

export const CIDADES_BAIRROS_POR_ESTADO: Record<string, string[]> = {
  SP: ['São Paulo - Centro', 'São Paulo - Zona Sul', 'São Paulo - Zona Norte', 'São Paulo - Zona Leste', 'São Paulo - Zona Oeste', 'Campinas', 'Santos', 'Ribeirão Preto', 'São José dos Campos', 'Sorocaba', 'Outra Região/Bairro'],
  RJ: ['Rio de Janeiro - Centro', 'Rio de Janeiro - Zona Sul', 'Rio de Janeiro - Zona Norte', 'Rio de Janeiro - Zona Oeste', 'Niterói', 'Duque de Caxias', 'Nova Iguaçu', 'Outra Região/Bairro'],
  MG: ['Belo Horizonte - Centro', 'Belo Horizonte - Savassi', 'Belo Horizonte - Pampulha', 'Uberlândia', 'Juiz de Fora', 'Contagem', 'Outra Região/Bairro'],
  BA: ['Salvador - Centro', 'Salvador - Barra', 'Salvador - Pituba', 'Feira de Santana', 'Vitória da Conquista', 'Outra Região/Bairro'],
  PR: ['Curitiba - Centro', 'Curitiba - Batel', 'Londrina', 'Maringá', 'Ponta Grossa', 'Outra Região/Bairro'],
  RS: ['Porto Alegre - Centro', 'Porto Alegre - Moinhos de Vento', 'Caxias do Sul', 'Pelotas', 'Outra Região/Bairro'],
  PE: ['Recife - Centro', 'Recife - Boa Viagem', 'Olinda', 'Caruaru', 'Outra Região/Bairro'],
  CE: ['Fortaleza - Centro', 'Fortaleza - Meireles', 'Caucaia', 'Juazeiro do Norte', 'Outra Região/Bairro'],
  DF: ['Brasília - Plano Piloto', 'Brasília - Taguatinga', 'Brasília - Águas Claras', 'Brasília - Ceilândia', 'Outra Região/Bairro'],
  ES: ['Vitória - Centro', 'Vila Velha', 'Serra', 'Cariacica', 'Outra Região/Bairro'],
  GO: ['Goiânia - Centro', 'Goiânia - Bueno', 'Aparecida de Goiânia', 'Anápolis', 'Outra Região/Bairro'],
  SC: ['Florianópolis - Centro', 'Joinville', 'Blumenau', 'São José', 'Outra Região/Bairro'],
  MA: ['São Luís - Centro', 'Imperatriz', 'Outra Região/Bairro'],
  AM: ['Manaus - Centro', 'Manaus - Adrianópolis', 'Outra Região/Bairro'],
  PA: ['Belém - Centro', 'Ananindeua', 'Santarém', 'Outra Região/Bairro'],
  PB: ['João Pessoa - Centro', 'Campina Grande', 'Outra Região/Bairro'],
  RN: ['Natal - Centro', 'Mossoró', 'Outra Região/Bairro'],
  AL: ['Maceió - Centro', 'Arapiraca', 'Outra Região/Bairro'],
  SE: ['Aracaju - Centro', 'Nossa Senhora do Socorro', 'Outra Região/Bairro'],
  PI: ['Teresina - Centro', 'Parnaíba', 'Outra Região/Bairro'],
  MT: ['Cuiabá - Centro', 'Várzea Grande', 'Rondonópolis', 'Outra Região/Bairro'],
  MS: ['Campo Grande - Centro', 'Dourados', 'Outra Região/Bairro'],
  RO: ['Porto Velho - Centro', 'Ji-Paraná', 'Outra Região/Bairro'],
  AC: ['Rio Branco - Centro', 'Cruzeiro do Sul', 'Outra Região/Bairro'],
  RR: ['Boa Vista - Centro', 'Outra Região/Bairro'],
  AP: ['Macapá - Centro', 'Santana', 'Outra Região/Bairro'],
  TO: ['Palmas - Centro', 'Araguaína', 'Outra Região/Bairro'],
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
  const [categorias, setCategorias] = useState<CategoriaMaterial[]>([])
  const [taxasDisponiveis, setTaxasDisponiveis] = useState<Taxa[]>([])
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

  // Localização Geográfica e Tarifas de Concessionárias (Seção 3)
  const [pais, setPais] = useState('Brasil')
  const [estado, setEstado] = useState('SP')
  const [cidadeBairro, setCidadeBairro] = useState('São Paulo - Centro')
  const [concessionariaLuz, setConcessionariaLuz] = useState<string | undefined>()
  const [concessionariaAgua, setConcessionariaAgua] = useState<string | undefined>()
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<string | undefined>()
  const [statusMensagem, setStatusMensagem] = useState<string | undefined>()
  const [buscandoTarifas, setBuscandoTarifas] = useState(false)
  const [salvandoTarifas, setSalvandoTarifas] = useState(false)

  // Energia Elétrica (Luz)
  const [minutosLuz, setMinutosLuz] = useState('')
  const [tarifaKwh, setTarifaKwh] = useState('0.85')
  const [usosEnergia, setUsosEnergia] = useState<UsoEnergiaItem[]>([])

  // Água (Tarifa por m³)
  const [tarifaAguaM3, setTarifaAguaM3] = useState('15.00')

  // Mão de Obra e Custos Fixos (Seção 4)
  const [valorDiaMaoDeObra, setValorDiaMaoDeObra] = useState('200.00')
  const [jornadaHorasDia, setJornadaHorasDia] = useState('8')
  const [horasProducao, setHorasProducao] = useState('')
  const [valorHora, setValorHora] = useState('25.00')
  const [rateioFixoPercent, setRateioFixoPercent] = useState('')

  // Lucro e Taxas do Marketplace (Seção 4)
  const [margemLucroPercent, setMargemLucroPercent] = useState('')
  const [taxaSelecionadaId, setTaxaSelecionadaId] = useState('')
  const [percentualTaxas, setPercentualTaxas] = useState('0')
  const [taxaFixa, setTaxaFixa] = useState('0')

  const [carregado, setCarregado] = useState(false)

  const materiaisAdministrativos = useMemo(() => {
    return materiaisEstoque.filter((m) => {
      if (m.tipoClassificacao === 'administrativo') return true
      const cat = categorias.find((c) => c.id === m.categoriaId)
      if (cat?.tipoClassificacao === 'administrativo') return true
      const nomeCat = (cat?.nome || '').toLowerCase()
      const nomeMat = (m.nome || '').toLowerCase()
      return (
        nomeCat.includes('administrativo') ||
        nomeCat.includes('embalagen') ||
        nomeCat.includes('gráfica') ||
        nomeCat.includes('mimo') ||
        nomeMat.includes('caixa') ||
        nomeMat.includes('embalagem') ||
        nomeMat.includes('etiqueta') ||
        nomeMat.includes('papel') ||
        nomeMat.includes('fita') ||
        nomeMat.includes('bolha')
      )
    })
  }, [materiaisEstoque, categorias])

  async function carregarTarifasLocais() {
    const t = await obterTarifasConfig()
    if (!montado.current) return
    const vHora = t.valorHoraMaoDeObra || 25.0
    setValorHora(String(vHora))
    setValorDiaMaoDeObra((vHora * 8).toFixed(2))
    setTarifaKwh(String(t.tarifaKwh))
    setTarifaAguaM3(String(t.tarifaAguaM3))
    setPais(t.pais || 'Brasil')
    setEstado(t.estado || 'SP')
    setCidadeBairro(t.cidadeBairro || 'São Paulo')
    setConcessionariaLuz(t.concessionariaLuz)
    setConcessionariaAgua(t.concessionariaAgua)
    setUltimaAtualizacao(t.ultimaAtualizacaoTarifas)
    setStatusMensagem(t.statusAtualizacaoTarifas)
  }


  useEffect(() => {
    montado.current = true
    Promise.all([
      listarPecas(),
      db.equipamentos.toArray(),
      listarMateriais(),
      db.categoriasMaterial.toArray(),
      listarTaxas(),
      carregarTarifasLocais(),
    ])
      .then(([listaPecas, listaEquipamentos, listaMateriais, listaCategorias, listaTaxas]) => {
        if (!montado.current) return
        setPecas(listaPecas)
        setEquipamentos(listaEquipamentos)
        setMateriaisEstoque(listaMateriais)
        setCategorias(listaCategorias)
        setTaxasDisponiveis(listaTaxas)

        // Sincroniza concessionárias em segundo plano se necessário
        sincronizarTarifasConcessionaria(false).then((res) => {
          if (montado.current && res.atualizou) {
            carregarTarifasLocais()
          }
        }).catch(() => {})

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

  // Atualização automática do valor por hora ao modificar o valor do dia ou jornada
  function handleMudarValorDia(valDiaStr: string) {
    setValorDiaMaoDeObra(valDiaStr)
    const dia = Number(valDiaStr) || 0
    const jrn = Number(jornadaHorasDia) || 8
    if (jrn > 0) {
      setValorHora((dia / jrn).toFixed(2))
    }
  }

  function handleMudarJornada(jrnStr: string) {
    setJornadaHorasDia(jrnStr)
    const dia = Number(valorDiaMaoDeObra) || 0
    const jrn = Number(jrnStr) || 8
    if (jrn > 0) {
      setValorHora((dia / jrn).toFixed(2))
    }
  }

  function handleMudarValorHora(valHoraStr: string) {
    setValorHora(valHoraStr)
    const hr = Number(valHoraStr) || 0
    const jrn = Number(jornadaHorasDia) || 8
    setValorDiaMaoDeObra((hr * jrn).toFixed(2))
  }

  // Atualização da taxa selecionada (Taxas & Canais)
  function handleSelecionarTaxa(taxaIdStr: string) {
    setTaxaSelecionadaId(taxaIdStr)
    if (!taxaIdStr) {
      setPercentualTaxas('0')
      setTaxaFixa('0')
      return
    }
    const encontrada = taxasDisponiveis.find((t) => String(t.id) === taxaIdStr)
    if (encontrada) {
      setPercentualTaxas(String(encontrada.percentual * 100))
      setTaxaFixa(String(encontrada.valorFixo))
    }
  }

  async function handleBuscarConcessionariasOnline() {
    setBuscandoTarifas(true)
    try {
      const res = await sincronizarTarifasConcessionaria(true, { pais, estado, cidadeBairro })
      if (!montado.current) return
      setTarifaKwh(String(res.tarifaKwh))
      setTarifaAguaM3(String(res.tarifaAguaM3))
      setConcessionariaLuz(res.concessionariaLuz)

      setConcessionariaAgua(res.concessionariaAgua)
      setUltimaAtualizacao(res.ultimaAtualizacaoIso)
      setStatusMensagem(res.mensagemStatus)
      mostrarToast(`Concessionárias de ${estado ? estado.toUpperCase() : 'SP'} atualizadas com sucesso!`, 'sucesso')
    } catch (err) {
      if (!montado.current) return
      mostrarToast(err instanceof Error ? err.message : 'Erro ao consultar concessionárias.', 'erro')
    } finally {
      if (montado.current) setBuscandoTarifas(false)
    }
  }

  const opcoesCidadeBairro = useMemo(() => {
    const lista = CIDADES_BAIRROS_POR_ESTADO[estado]
      ? [...CIDADES_BAIRROS_POR_ESTADO[estado]]
      : ['Região Central', 'Zona Norte / Sul / Leste / Oeste', 'Outra Região/Bairro']
    if (cidadeBairro && !lista.includes(cidadeBairro)) {
      lista.unshift(cidadeBairro)
    }
    return lista
  }, [estado, cidadeBairro])

  function handleMudarPais(novoPais: string) {
    setPais(novoPais)
    if (novoPais === 'Brasil') {
      const novoEst = estado && ESTADOS_BRASIL.some((e) => e.uf === estado) ? estado : 'SP'
      setEstado(novoEst)
      const cidades = CIDADES_BAIRROS_POR_ESTADO[novoEst] || ['Região Central']
      const novaCid = cidades[0]
      setCidadeBairro(novaCid)
      sincronizarTarifasConcessionaria(true, { pais: novoPais, estado: novoEst, cidadeBairro: novaCid })
        .then((res) => {
          if (montado.current) {
            setTarifaKwh(String(res.tarifaKwh))
            setTarifaAguaM3(String(res.tarifaAguaM3))
            setConcessionariaLuz(res.concessionariaLuz)
            setConcessionariaAgua(res.concessionariaAgua)
            setUltimaAtualizacao(res.ultimaAtualizacaoIso)
            setStatusMensagem(res.mensagemStatus)
          }
        })
        .catch(() => {})
    } else {
      sincronizarTarifasConcessionaria(true, { pais: novoPais, estado, cidadeBairro })
        .then((res) => {
          if (montado.current) {
            setTarifaKwh(String(res.tarifaKwh))
            setTarifaAguaM3(String(res.tarifaAguaM3))
            setConcessionariaLuz(res.concessionariaLuz)
            setConcessionariaAgua(res.concessionariaAgua)
            setUltimaAtualizacao(res.ultimaAtualizacaoIso)
            setStatusMensagem(res.mensagemStatus)
          }
        })
        .catch(() => {})
    }
  }

  function handleMudarEstado(novoEstado: string) {
    setEstado(novoEstado)
    const cidades = CIDADES_BAIRROS_POR_ESTADO[novoEstado] || ['Região Central', 'Outra Região/Bairro']
    const novaCidade = cidades[0] || 'Região Central'
    setCidadeBairro(novaCidade)

    sincronizarTarifasConcessionaria(true, { pais, estado: novoEstado, cidadeBairro: novaCidade })
      .then((res) => {
        if (montado.current) {
          setTarifaKwh(String(res.tarifaKwh))
          setTarifaAguaM3(String(res.tarifaAguaM3))
          setConcessionariaLuz(res.concessionariaLuz)
          setConcessionariaAgua(res.concessionariaAgua)
          setUltimaAtualizacao(res.ultimaAtualizacaoIso)
          setStatusMensagem(res.mensagemStatus)
        }
      })
      .catch(() => {})
  }

  async function handleSalvarTarifasLocais(e: React.FormEvent) {
    e.preventDefault()
    setSalvandoTarifas(true)
    try {
      await salvarTarifasConfig({
        valorHoraMaoDeObra: Number(valorHora) || 0,
        tarifaKwh: Number(tarifaKwh) || 0,
        tarifaAguaM3: Number(tarifaAguaM3) || 0,
        pais,
        estado,
        cidadeBairro,
      })
      const res = await sincronizarTarifasConcessionaria(true, { pais, estado, cidadeBairro })
      if (!montado.current) return
      setConcessionariaLuz(res.concessionariaLuz)
      setConcessionariaAgua(res.concessionariaAgua)
      setUltimaAtualizacao(res.ultimaAtualizacaoIso)
      setStatusMensagem(res.mensagemStatus)
      mostrarToast('Tarifas de utilidades salvas com sucesso!', 'sucesso')
    } catch (err) {
      if (!montado.current) return
      mostrarToast(err instanceof Error ? err.message : 'Erro ao salvar tarifas.', 'erro')
    } finally {
      if (montado.current) setSalvandoTarifas(false)
    }
  }

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
        tarifaAguaPorLitro: Number(tarifaAguaM3) > 0 ? Number(tarifaAguaM3) / 1000 : 0.015,

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
    tarifaAguaM3,
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
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-3.5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase text-primary flex items-center gap-1.5">
                🏭 Custos Consolidados da Produção (Automático)
              </h3>
              {pecaSelecionadaId ? (
                <span className="text-[11px] font-semibold text-success bg-success/15 px-2 py-0.5 rounded">
                  ✓ Peça Vinculada
                </span>
              ) : (
                <span className="text-[11px] text-on-surface-variant italic">
                  Selecione uma peça no item 1 para carregar os valores da produção
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-surface p-2.5 rounded border border-outline-variant/40 flex flex-col gap-0.5">
                <span className="text-xs text-on-surface-variant font-medium">🧪 Material / Resina</span>
                <span className="text-base font-bold text-on-surface">
                  {formatarMoeda(Number(custoMaterial) || 0)}
                </span>
                <span className="text-[10px] text-on-surface-variant">Vindo dos insumos da produção</span>
              </div>

              <div className="bg-surface p-2.5 rounded border border-outline-variant/40 flex flex-col gap-0.5">
                <span className="text-xs text-on-surface-variant font-medium">💎 Acessórios & Enfeites</span>
                <span className="text-base font-bold text-on-surface">
                  {formatarMoeda(Number(custoAcessorios) || 0)}
                </span>
                <span className="text-[10px] text-on-surface-variant">Vindo dos insumos da produção</span>
              </div>

              <div className="bg-surface p-2.5 rounded border border-outline-variant/40 flex flex-col gap-0.5">
                <span className="text-xs text-on-surface-variant font-medium">🧱 Molde / Forma (Amortização)</span>
                <span className="text-base font-bold text-on-surface">
                  {formatarMoeda(Number(custoForma) || 0)}
                </span>
                <span className="text-[10px] text-on-surface-variant">Custo de fabricação / Vida útil</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
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
              📦 Caixas, Embalagens & Insumos Administrativos (Estoque)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
              <div className="flex flex-col gap-1">
                <label htmlFor="select-insumo-estoque" className="text-sm font-medium text-on-surface">
                  Caixa / Embalagem / Papelaria / Plástico Bolha
                </label>
                <select
                  id="select-insumo-estoque"
                  value={materialInsumoId}
                  onChange={(e) => setMaterialInsumoId(e.target.value)}
                  className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="">
                    {materiaisAdministrativos.length > 0
                      ? 'Selecione um item administrativo/embalagem...'
                      : 'Nenhum item administrativo/embalagem no estoque'}
                  </option>
                  {materiaisAdministrativos.map((m) => (
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

      {/* SEÇÃO 3: Consumo de Utilidades (Energia Elétrica / Luz & Água) + Tarifas Geográficas das Concessionárias */}
      <section>
        <h2 className="mb-2 text-sm font-semibold text-on-surface">
          3. Consumo de Utilidades (Energia Elétrica / Luz & Água) & Tarifas Locais
        </h2>
        <Card className="flex flex-col gap-5">
          <form onSubmit={handleSalvarTarifasLocais} className="flex flex-col gap-4 bg-surface-container-high/30 p-3.5 rounded-xl border border-outline-variant/20">
            <div className="flex flex-col gap-1">
              <h3 className="text-xs font-bold uppercase text-primary flex items-center gap-1.5">
                📍 Localização do Ateliê & Consulta Automática de Tarifas
              </h3>
              <p className="text-xs text-on-surface-variant">
                Defina o país, estado e cidade para buscar e aplicar automaticamente as tarifas de energia e água vigentes na sua região.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="flex flex-col gap-1">
                <label htmlFor="config-pais" className="text-sm font-medium text-on-surface">
                  País
                </label>
                <select
                  id="config-pais"
                  value={pais}
                  onChange={(e) => handleMudarPais(e.target.value)}
                  className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  {LISTA_PAISES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="config-estado" className="text-sm font-medium text-on-surface">
                  Estado (UF)
                </label>
                <select
                  id="config-estado"
                  value={estado}
                  onChange={(e) => handleMudarEstado(e.target.value)}
                  className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  {pais === 'Brasil' ? (
                    ESTADOS_BRASIL.map((est) => (
                      <option key={est.uf} value={est.uf}>
                        {est.nome}
                      </option>
                    ))
                  ) : (
                    <option value={estado}>{estado || 'Geral'}</option>
                  )}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="config-cidade-bairro" className="text-sm font-medium text-on-surface">
                  Cidade / Bairro
                </label>
                <select
                  id="config-cidade-bairro"
                  value={cidadeBairro}
                  onChange={(e) => setCidadeBairro(e.target.value)}
                  className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  {opcoesCidadeBairro.map((cb) => (
                    <option key={cb} value={cb}>
                      {cb}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-outline-variant/30">
              <TextField
                id="config-tarifa-kwh"
                rotulo="Tarifa de Luz (R$ / kWh)"
                type="number"
                step="0.01"
                value={tarifaKwh}
                onChange={(e) => setTarifaKwh(e.target.value)}
              />
              <TextField
                id="config-tarifa-agua-m3"
                rotulo="Tarifa de Água (R$ / m³)"
                type="number"
                step="0.01"
                value={tarifaAguaM3}
                onChange={(e) => setTarifaAguaM3(e.target.value)}
              />

            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <Button
                type="button"
                variante="ghost"
                className="text-xs flex items-center gap-1.5 border border-primary/30 text-primary hover:bg-primary/10"
                onClick={handleBuscarConcessionariasOnline}
                disabled={buscandoTarifas}
              >
                {buscandoTarifas ? '⏳ Consultando Concessionárias...' : `⚡ Buscar Tarifas da Concessionária da Região (${estado ? estado.toUpperCase() : 'SP'})`}
              </Button>
              <Button type="submit" disabled={salvandoTarifas}>
                Salvar Tarifas do Ateliê
              </Button>
            </div>

            {/* Card de Status da Concessionária */}
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 flex flex-col gap-2 mt-1">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-xs font-bold uppercase text-primary flex items-center gap-1.5">
                  🏬 Concessionárias Identificadas ({estado} / {pais})
                </h4>
                {ultimaAtualizacao && (
                  <Badge variant="neutral">
                    Última checagem: {new Date(ultimaAtualizacao).toLocaleDateString('pt-BR')}
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-on-surface">
                <div>
                  ⚡ <strong>Luz:</strong> {concessionariaLuz || 'Não identificada'} ({formatarMoeda(Number(tarifaKwh))} / kWh)
                </div>
                <div>
                  💧 <strong>Água:</strong> {concessionariaAgua || 'Não identificada'} ({formatarMoeda(Number(tarifaAguaM3))} / m³)
                </div>
              </div>

              {statusMensagem && (
                <p className="text-[11px] text-on-surface-variant font-medium mt-1">
                  ℹ️ Status das Tarifas: {statusMensagem}
                </p>
              )}
            </div>
          </form>

          {/* Energia Elétrica (Maquinário & Soprador) */}
          <div className="flex flex-col gap-3 rounded-lg border border-outline-variant/60 bg-surface-variant/20 p-3">
            <h3 className="text-sm font-semibold text-on-surface flex items-center gap-1.5">
              ⚡ Energia Elétrica da Produção (Maquinários & Soprador)
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
                  <option value="">+ Selecionar ferramenta (Lâmpada UV, Secador, Soprador, Furadeira, Politriz...)</option>
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

          {/* Consumo de Água (Registro da Tarifa Cadastrada) */}
          <div className="flex flex-col gap-2.5 rounded-lg border border-outline-variant/60 bg-surface-variant/20 p-3.5">
            <h3 className="text-sm font-semibold text-on-surface flex items-center gap-1.5">
              💧 Tarifa Local de Água (Concessionária {concessionariaAgua ? `- ${concessionariaAgua}` : ''})
            </h3>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-on-surface-variant">
              <div>
                <p className="text-sm font-semibold text-on-surface">
                  Tarifa Vigente: {formatarMoeda(Number(tarifaAguaM3) || 15)} / m³ (R$ {(Number(tarifaAguaM3) / 1000).toFixed(4)} / Litro)
                </p>
                <p className="text-[11px] text-on-surface-variant mt-0.5">
                  ℹ️ O consumo de água (litros) é registrado diretamente na produção das peças. Aqui fica registrado o valor da tarifa oficial para a sua região ({estado} / {pais}).
                </p>
              </div>
              <Badge variant="neutral">Concessionária: {concessionariaAgua || 'Local'}</Badge>
            </div>
          </div>
        </Card>
      </section>

      {/* SEÇÃO 4: Mão de Obra (por Dia/Hora), Custo Fixo, Margem de Lucro & Canais de Venda */}
      <section>
        <h2 className="mb-2 text-sm font-semibold text-on-surface">4. Mão de Obra, Custo Fixo & Margens</h2>
        <Card className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 bg-surface-container-high/30 p-3.5 rounded-xl border border-outline-variant/20">
            <div className="flex flex-col gap-1">
              <h3 className="text-xs font-bold uppercase text-primary flex items-center gap-1.5">
                💼 Mão de Obra & Ganho Diário do Ateliê
              </h3>
              <p className="text-xs text-on-surface-variant">
                Informe quanto você deseja receber por dia trabalhado (ex: R$ 300,00). A divisão pelas horas ativas trabalhadas por peça ocorre na produção.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
              <TextField
                id="valor-dia-mao-obra"
                rotulo="Mão de Obra por Dia / Ganho Diário (R$ / Dia)"
                type="number"
                step="0.01"
                value={valorDiaMaoDeObra}
                onChange={(e) => handleMudarValorDia(e.target.value)}
                placeholder="Ex: 300.00"
              />
              <div className="rounded-lg border border-outline-variant/40 bg-surface px-3 py-2 flex items-center justify-between">
                <span className="text-xs text-on-surface-variant font-medium">Equivalente por hora (base 8h):</span>
                <span className="text-sm font-bold text-primary font-mono">
                  {formatarMoeda(Number(valorHora) || 0)} / hora
                </span>
              </div>
            </div>
          </div>

          <div className="hidden">
            <TextField
              id="jornada-horas-dia"
              rotulo="Jornada diária (Horas / Dia)"
              type="number"
              value={jornadaHorasDia}
              onChange={(e) => handleMudarJornada(e.target.value)}
            />
            <TextField
              id="valor-hora"
              rotulo="Valor da hora (R$)"
              type="number"
              value={valorHora}
              onChange={(e) => handleMudarValorHora(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-outline-variant/30">
            <TextField
              id="horas-producao"
              rotulo="Horas de produção desta peça"
              type="number"
              step="0.1"
              value={horasProducao}
              onChange={(e) => setHorasProducao(e.target.value)}
              placeholder="Ex: 1.5"
            />
            <TextField
              id="rateio-fixo"
              rotulo="Rateio de custo fixo (%)"
              type="number"
              value={rateioFixoPercent}
              onChange={(e) => setRateioFixoPercent(e.target.value)}
              placeholder="Ex: 15"
            />
            <TextField
              id="margem-lucro"
              rotulo="Margem de lucro (%)"
              type="number"
              value={margemLucroPercent}
              onChange={(e) => setMargemLucroPercent(e.target.value)}
              placeholder="Ex: 40"
            />
          </div>

          {/* Seleção de Canais de Venda e Taxas de Marketplace cadastrados em Taxas & Canais */}
          <div className="flex flex-col gap-2 pt-3 border-t border-outline-variant/30">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <label htmlFor="select-taxa-canal" className="text-sm font-medium text-on-surface">
                Canal de Venda / Plataforma (Taxas do Marketplace)
              </label>
              <span className="text-xs text-primary font-medium">
                📌 As taxas são cadastradas na aba <strong>Taxas & Canais</strong>
              </span>
            </div>
            <select
              id="select-taxa-canal"
              value={taxaSelecionadaId}
              onChange={(e) => handleSelecionarTaxa(e.target.value)}
              className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            >
              <option value="">Venda Direta / Sem Taxa de Plataforma (0%)</option>
              {taxasDisponiveis.map((taxa) => (
                <option key={taxa.id} value={taxa.id}>
                  {taxa.nome} — {(taxa.percentual * 100).toFixed(1)}% {taxa.valorFixo > 0 ? `+ ${formatarMoeda(taxa.valorFixo)}` : ''}
                </option>
              ))}
            </select>
            {taxaSelecionadaId && (
              <p className="text-xs text-on-surface-variant">
                Taxa aplicada: <strong>{(Number(percentualTaxas)).toFixed(1)}%</strong>
                {Number(taxaFixa) > 0 ? ` + ${formatarMoeda(Number(taxaFixa))} taxa fixa` : ''} por venda.
              </p>
            )}
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

