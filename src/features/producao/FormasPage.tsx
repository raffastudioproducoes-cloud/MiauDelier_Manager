import { useEffect, useMemo, useRef, useState } from 'react'
import { z } from 'zod'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { TextField } from '../../components/ui/TextField'
import { Badge } from '../../components/ui/Badge'
import { EmptyState } from '../../components/ui/EmptyState'
import { ConfirmModal } from '../../components/ui/ConfirmModal'
import { useToast } from '../../components/ui/useToast'
import { calcularVolumeMl, calcularVolumeMesaResina, type FuroVazadoInput, type PeMesaInput } from '../calculator/volume'
import { criarForma, listarFormas, atualizarForma, excluirForma, finalizarCuraForma } from './formasRepo'
import { listarMateriais } from './materiaisRepo'
import type { Forma, FormaGeometria, Material, FuroVazadoForma } from '../../db/schema'

const schemaForma = z.object({
  nome: z.string().trim().min(1, 'Informe o nome da forma').max(120),
})

const ROTULOS_GEOMETRIA: Record<FormaGeometria, string> = {
  retangular: 'Retangular',
  cilindrico: 'Cilíndrico',
  esferico: 'Esférico',
  direto: 'Volume direto',
}



function dimensoesGeometria(geometria: FormaGeometria, dimensoes: {
  comprimento: string
  largura: string
  profundidade: string
  raio: string
  altura: string
  volumeMl: string
}) {
  switch (geometria) {
    case 'retangular':
      return {
        comprimento: Number(dimensoes.comprimento),
        largura: Number(dimensoes.largura),
        profundidade: Number(dimensoes.profundidade),
      }
    case 'cilindrico':
      return { raio: Number(dimensoes.raio), altura: Number(dimensoes.altura) }
    case 'esferico':
      return { raio: Number(dimensoes.raio) }
    case 'direto':
      return {}
  }
}

function resumoDimensoes(forma: Forma): string {
  const d = forma.dimensoesCm
  let base = ''
  switch (forma.geometria) {
    case 'retangular':
      base = `${d.comprimento} × ${d.largura} × ${d.profundidade} cm`
      break
    case 'cilindrico':
      base = `raio ${d.raio} cm · altura ${d.altura} cm`
      break
    case 'esferico':
      base = `raio ${d.raio} cm`
      break
    case 'direto':
      base = 'volume direto'
      break
  }

  if (forma.furosVazados && forma.furosVazados.length > 0) {
    const totalFuros = forma.furosVazados.reduce((acc, f) => acc + (f.quantidade || 0), 0)
    const diamStr = forma.furosVazados[0]?.diametroCm ? `ø${forma.furosVazados[0].diametroCm}cm` : ''
    base += ` · 🐾 ${totalFuros} furo(s) ${diamStr}`.trim()
  }

  if (forma.pesMesa && forma.pesMesa.quantidade > 0) {
    base += ` · 🦵 ${forma.pesMesa.quantidade} pé(s)`
  }

  return base
}

interface FuroVazadoFormState {
  id: string
  quantidade: string
  diametroCm: string
  comprimentoCm: string
  larguraCm: string
  profundidadeCm: string
  geometria: 'circulo' | 'retangulo'
}

export function FormasPage() {
  const { mostrarToast } = useToast()
  const [formas, setFormas] = useState<Forma[]>([])
  const [materiais, setMateriais] = useState<Material[]>([])
  const [nome, setNome] = useState('')
  const [geometria, setGeometria] = useState<FormaGeometria>('cilindrico')
  const [comprimento, setComprimento] = useState('')
  const [largura, setLargura] = useState('')
  const [profundidade, setProfundidade] = useState('')
  const [raio, setRaio] = useState('')
  const [altura, setAltura] = useState('')
  const [volumeMl, setVolumeMl] = useState('')

  // Furos / Vazados (Comedouros Pets) & Pés da Mesa
  const [furos, setFuros] = useState<FuroVazadoFormState[]>([])
  const [temPes, setTemPes] = useState(false)
  const [qtdPes, setQtdPes] = useState('4')
  const [geometriaPes, setGeometriaPes] = useState<'cilindrico' | 'retangular'>('cilindrico')
  const [raioPes, setRaioPes] = useState('1.5')
  const [alturaPes, setAlturaPes] = useState('10')
  const [compPes, setCompPes] = useState('4')
  const [largPes, setLargPes] = useState('4')
  const [margemSeguranca, setMargemSeguranca] = useState('10')

  // Silicone & Caixa de Contenção & Amortização do Molde & Cura
  const [materialSiliconeId, setMaterialSiliconeId] = useState('')
  const [qtdSilicone, setQtdSilicone] = useState('')
  const [mostrarTodosMateriais, setMostrarTodosMateriais] = useState(false)
  const [materialCaixaEstrutura, setMaterialCaixaEstrutura] = useState('')
  const [custoCaixaEstrutura, setCustoCaixaEstrutura] = useState('')
  const [custoFabricacao, setCustoFabricacao] = useState('')
  const [vidaUtilUsos, setVidaUtilUsos] = useState('50')
  const [curaHoras, setCuraHoras] = useState('0')

  const [erro, setErro] = useState<string | null>(null)
  const [formaEmEdicaoId, setFormaEmEdicaoId] = useState<number | null>(null)
  const [formaExcluindoId, setFormaExcluindoId] = useState<number | null>(null)

  const montado = useRef(true)

  async function recarregar() {
    const [formasCarregadas, materiaisCarregados] = await Promise.all([
      listarFormas(),
      listarMateriais(),
    ])
    if (!montado.current) return
    setFormas(formasCarregadas)
    setMateriais(materiaisCarregados)
  }

  useEffect(() => {
    montado.current = true
    recarregar().catch((falha) => {
      if (!montado.current) return
      mostrarToast(falha instanceof Error ? falha.message : 'Erro ao carregar formas.', 'erro')
    })
    return () => {
      montado.current = false
    }
  }, [])

  // Lista de materiais filtrada para silicones/endurecedores/borrachas (com opção de ver todos)
  const materiaisSilicone = useMemo(() => {
    if (mostrarTodosMateriais) return materiais
    return materiais.filter((m) => {
      const nomeLower = m.nome.toLowerCase()
      return (
        nomeLower.includes('silicone') ||
        nomeLower.includes('catalisador') ||
        nomeLower.includes('endurecedor') ||
        nomeLower.includes('borracha')
      )
    })
  }, [materiais, mostrarTodosMateriais])

  // Auto calcula o custo total do molde (Silicone + Caixa de Contenção / Estrutura)
  useEffect(() => {
    let custoSiliconeCalc = 0
    if (materialSiliconeId && qtdSilicone) {
      const mat = materiais.find((m) => String(m.id) === materialSiliconeId)
      const qtd = Number(qtdSilicone)
      if (mat && !isNaN(qtd) && qtd > 0) {
        custoSiliconeCalc = qtd * mat.custoUnitario
      }
    }
    const custoCaixaNum = Number(custoCaixaEstrutura) || 0
    const totalCalc = custoSiliconeCalc + custoCaixaNum
    if (totalCalc > 0) {
      setCustoFabricacao(totalCalc.toFixed(2))
    }
  }, [materialSiliconeId, qtdSilicone, custoCaixaEstrutura, materiais])

  const resultadoMesaResina = useMemo(() => {
    if (geometria !== 'retangular') return null
    if (furos.length === 0 && !temPes) return null
    const c = Number(comprimento)
    const l = Number(largura)
    const e = Number(profundidade)
    if (isNaN(c) || c <= 0 || isNaN(l) || l <= 0 || isNaN(e) || e <= 0) return null

    const furosConvertidos: FuroVazadoInput[] = furos
      .map((f) => ({
        quantidade: Number(f.quantidade) || 0,
        geometria: f.geometria,
        diametroCm: Number(f.diametroCm) || 0,
        comprimentoCm: Number(f.comprimentoCm) || 0,
        larguraCm: Number(f.larguraCm) || 0,
        profundidadeCm: f.profundidadeCm ? Number(f.profundidadeCm) : undefined,
      }))
      .filter((f) => f.quantidade > 0)

    const pesConvertidos: PeMesaInput | undefined = temPes && Number(qtdPes) > 0
      ? {
          quantidade: Number(qtdPes) || 0,
          geometria: geometriaPes,
          raioCm: Number(raioPes) || 0,
          alturaCm: Number(alturaPes) || 0,
          comprimentoCm: Number(compPes) || 0,
          larguraCm: Number(largPes) || 0,
        }
      : undefined

    return calcularVolumeMesaResina({
      comprimentoCm: c,
      larguraCm: l,
      espessuraCm: e,
      furosVazados: furosConvertidos,
      pesMesa: pesConvertidos,
      margemSegurancaPercentual: Number(margemSeguranca || '10'),
    })
  }, [geometria, comprimento, largura, profundidade, furos, temPes, qtdPes, geometriaPes, raioPes, alturaPes, compPes, largPes, margemSeguranca])

  const volumeCalculado = useMemo(() => {
    if (geometria === 'retangular' && resultadoMesaResina) {
      return resultadoMesaResina.volumeComMargemMl
    }
    try {
      return calcularVolumeMl({
        geometria,
        ...dimensoesGeometria(geometria, { comprimento, largura, profundidade, raio, altura, volumeMl }),
        volumeMl: Number(volumeMl),
      })
    } catch {
      return null
    }
  }, [geometria, resultadoMesaResina, comprimento, largura, profundidade, raio, altura, volumeMl])

  const custoPorUsoCalculado = useMemo(() => {
    const c = Number(custoFabricacao)
    const v = Number(vidaUtilUsos)
    if (!isNaN(c) && c > 0 && !isNaN(v) && v > 0) {
      return (c / v).toFixed(2)
    }
    return null
  }, [custoFabricacao, vidaUtilUsos])

  function adicionarFuroVazado(geometriaFuro: 'circulo' | 'retangulo' = 'circulo') {
    setFuros((prev) => [
      ...prev,
      {
        id: String(Date.now() + Math.random()),
        quantidade: '2',
        diametroCm: '13',
        comprimentoCm: '10',
        larguraCm: '10',
        profundidadeCm: '',
        geometria: geometriaFuro,
      },
    ])
  }

  function removerFuroVazado(id: string) {
    setFuros((prev) => prev.filter((f) => f.id !== id))
  }

  function atualizarFuroVazado(id: string, campo: keyof FuroVazadoFormState, valor: string) {
    setFuros((prev) => prev.map((f) => (f.id === id ? { ...f, [campo]: valor } : f)))
  }

  function limparFormulario() {
    setNome('')
    setGeometria('cilindrico')
    setComprimento('')
    setLargura('')
    setProfundidade('')
    setRaio('')
    setAltura('')
    setVolumeMl('')
    setFuros([])
    setTemPes(false)
    setQtdPes('4')
    setGeometriaPes('cilindrico')
    setRaioPes('1.5')
    setAlturaPes('10')
    setCompPes('4')
    setLargPes('4')
    setMargemSeguranca('10')
    setMaterialSiliconeId('')
    setQtdSilicone('')
    setMaterialCaixaEstrutura('')
    setCustoCaixaEstrutura('')
    setCustoFabricacao('')
    setVidaUtilUsos('50')
    setCuraHoras('0')
    setFormaEmEdicaoId(null)
    setErro(null)
  }

  function iniciarEdicao(forma: Forma) {
    setFormaEmEdicaoId(forma.id ?? null)
    setNome(forma.nome)
    setGeometria(forma.geometria)
    const d = forma.dimensoesCm
    setComprimento(d.comprimento !== undefined ? String(d.comprimento) : '')
    setLargura(d.largura !== undefined ? String(d.largura) : '')
    setProfundidade(d.profundidade !== undefined ? String(d.profundidade) : '')
    setRaio(d.raio !== undefined ? String(d.raio) : '')
    setAltura(d.altura !== undefined ? String(d.altura) : '')
    setVolumeMl(forma.geometria === 'direto' && forma.volumeDiretoMl !== undefined ? String(forma.volumeDiretoMl) : '')

    // Furos / Vazados
    if (forma.furosVazados && forma.furosVazados.length > 0) {
      setFuros(
        forma.furosVazados.map((f) => ({
          id: f.id || String(Math.random()),
          quantidade: String(f.quantidade || 1),
          diametroCm: f.diametroCm !== undefined ? String(f.diametroCm) : '13',
          comprimentoCm: f.comprimentoCm !== undefined ? String(f.comprimentoCm) : '',
          larguraCm: f.larguraCm !== undefined ? String(f.larguraCm) : '',
          profundidadeCm: f.profundidadeCm !== undefined ? String(f.profundidadeCm) : '',
          geometria: f.geometria || 'circulo',
        })),
      )
    } else {
      setFuros([])
    }

    // Pés
    if (forma.pesMesa && forma.pesMesa.quantidade > 0) {
      setTemPes(true)
      setQtdPes(String(forma.pesMesa.quantidade))
      setGeometriaPes(forma.pesMesa.geometria)
      setRaioPes(forma.pesMesa.raioCm !== undefined ? String(forma.pesMesa.raioCm) : '1.5')
      setAlturaPes(forma.pesMesa.alturaCm !== undefined ? String(forma.pesMesa.alturaCm) : '10')
      setCompPes(forma.pesMesa.comprimentoCm !== undefined ? String(forma.pesMesa.comprimentoCm) : '4')
      setLargPes(forma.pesMesa.larguraCm !== undefined ? String(forma.pesMesa.larguraCm) : '4')
    } else {
      setTemPes(false)
    }

    setMargemSeguranca(forma.margemSegurancaPercentual !== undefined ? String(forma.margemSegurancaPercentual) : '10')

    setMaterialSiliconeId(forma.materialSiliconeId !== undefined ? String(forma.materialSiliconeId) : '')
    setQtdSilicone(forma.quantidadeSiliconeUsada !== undefined ? String(forma.quantidadeSiliconeUsada) : '')
    setMaterialCaixaEstrutura(forma.materialCaixaEstrutura ?? '')
    setCustoCaixaEstrutura(forma.custoCaixaEstrutura !== undefined ? String(forma.custoCaixaEstrutura) : '')
    setCustoFabricacao(forma.custoFabricacao !== undefined ? String(forma.custoFabricacao) : '')
    setVidaUtilUsos(forma.vidaUtilUsos !== undefined ? String(forma.vidaUtilUsos) : '50')
    setCuraHoras(forma.curaMinutos !== undefined ? String(forma.curaMinutos / 60) : '24')
    setErro(null)
  }

  async function handleSubmit(evento: React.FormEvent) {
    evento.preventDefault()
    setErro(null)

    const resultado = schemaForma.safeParse({ nome })
    if (!resultado.success) {
      setErro(resultado.error.issues[0]?.message ?? 'Dados inválidos')
      return
    }

    if (volumeCalculado === null || volumeCalculado <= 0) {
      setErro('Preencha as dimensões corretamente')
      return
    }

    const curaMin = Number(curaHoras) * 60

    const furosConvertidos: FuroVazadoForma[] = furos
      .map((f) => ({
        id: f.id,
        quantidade: Number(f.quantidade) || 0,
        geometria: f.geometria,
        diametroCm: Number(f.diametroCm) || 0,
        comprimentoCm: Number(f.comprimentoCm) || 0,
        larguraCm: Number(f.larguraCm) || 0,
        profundidadeCm: f.profundidadeCm ? Number(f.profundidadeCm) : undefined,
      }))
      .filter((f) => f.quantidade > 0)

    const pesConvertidos: PeMesaInput | undefined = temPes && Number(qtdPes) > 0
      ? {
          quantidade: Number(qtdPes) || 0,
          geometria: geometriaPes,
          raioCm: Number(raioPes) || 0,
          alturaCm: Number(alturaPes) || 0,
          comprimentoCm: Number(compPes) || 0,
          larguraCm: Number(largPes) || 0,
        }
      : undefined

    const litros = resultadoMesaResina
      ? resultadoMesaResina.litrosResina
      : volumeCalculado / 1000
    const massaKg = resultadoMesaResina
      ? resultadoMesaResina.massaResinaKg
      : litros * 1.1

    try {
      const dados = {
        nome: resultado.data.nome,
        geometria,
        dimensoesCm: dimensoesGeometria(geometria, { comprimento, largura, profundidade, raio, altura, volumeMl }),
        volumeDiretoMl: volumeCalculado,
        furosVazados: furosConvertidos.length > 0 ? furosConvertidos : undefined,
        pesMesa: pesConvertidos,
        margemSegurancaPercentual: Number(margemSeguranca || '10'),
        litrosResina: litros,
        massaResinaKg: massaKg,
        materialSiliconeId: materialSiliconeId ? Number(materialSiliconeId) : undefined,
        quantidadeSiliconeUsada: qtdSilicone ? Number(qtdSilicone) : undefined,
        materialCaixaEstrutura: materialCaixaEstrutura.trim() || undefined,
        custoCaixaEstrutura: custoCaixaEstrutura ? Number(custoCaixaEstrutura) : undefined,
        custoFabricacao: custoFabricacao ? Number(custoFabricacao) : undefined,
        vidaUtilUsos: vidaUtilUsos ? Number(vidaUtilUsos) : 50,
        curaMinutos: curaMin > 0 ? curaMin : undefined,
      }
      if (formaEmEdicaoId !== null) {
        await atualizarForma(formaEmEdicaoId, dados)
      } else {
        await criarForma(dados)
      }
    } catch (falha) {
      if (!montado.current) return
      mostrarToast(falha instanceof Error ? falha.message : 'Erro ao salvar.', 'erro')
      return
    }
    if (!montado.current) return
    mostrarToast(formaEmEdicaoId !== null ? 'Forma atualizada com sucesso' : 'Forma cadastrada com sucesso')
    limparFormulario()
    await recarregar()
  }

  async function handleFinalizarCura(formaId: number) {
    try {
      await finalizarCuraForma(formaId)
    } catch (falha) {
      if (!montado.current) return
      mostrarToast(falha instanceof Error ? falha.message : 'Erro ao finalizar cura do molde.', 'erro')
      return
    }
    if (!montado.current) return
    mostrarToast('Cura do molde finalizada! Agora ele está disponível para fabricação de peças.')
    await recarregar()
  }

  async function handleExcluir(formaId: number) {
    try {
      await excluirForma(formaId)
    } catch (falha) {
      if (!montado.current) return
      mostrarToast(falha instanceof Error ? falha.message : 'Erro ao excluir forma.', 'erro')
      return
    }
    if (!montado.current) return
    mostrarToast('Forma excluída com sucesso')
    setFormaExcluindoId(null)
    await recarregar()
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-on-surface">Formas & Moldes</h1>
        <p className="text-label-sm text-on-surface-variant">Banco técnico de fabricação de moldes do ateliê (com suporte a mesas comedouro vazadas).</p>
      </div>

      <Card>
        <h2 className="mb-3 font-medium text-on-surface">
          {formaEmEdicaoId !== null ? 'Editar forma' : 'Fabricar Novo Molde'}
        </h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <TextField id="nome-forma" rotulo="Nome da forma" value={nome} onChange={(e) => setNome(e.target.value)} />

          <div className="flex flex-col gap-1">
            <label htmlFor="geometria-forma" className="text-sm font-medium text-on-surface">Geometria</label>
            <select
              id="geometria-forma"
              value={geometria}
              onChange={(e) => setGeometria(e.target.value as FormaGeometria)}
              className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            >
              {(Object.keys(ROTULOS_GEOMETRIA) as FormaGeometria[]).map((chave) => (
                <option key={chave} value={chave}>{ROTULOS_GEOMETRIA[chave]}</option>
              ))}
            </select>
          </div>

          {geometria === 'retangular' && (
            <div className="flex flex-col gap-4 border-l-2 border-primary/30 pl-3 py-1">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <TextField id="comprimento-forma" rotulo="Comprimento (cm)" type="number" value={comprimento} onChange={(e) => setComprimento(e.target.value)} />
                <TextField id="largura-forma" rotulo="Largura (cm)" type="number" value={largura} onChange={(e) => setLargura(e.target.value)} />
                <TextField id="profundidade-forma" rotulo="Profundidade / Espessura (cm)" type="number" value={profundidade} onChange={(e) => setProfundidade(e.target.value)} />
              </div>

              {/* Furos / Vazados (Comedouros Pets) */}
              <div className="flex flex-col gap-2 rounded-lg border border-outline-variant/60 bg-surface-variant/20 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-on-surface flex items-center gap-1.5">
                      🐾 Furos & Vazados (Tigelas Comedouros)
                    </h4>
                    <p className="text-xs text-on-surface-variant">
                      Adicione os furos vazados para descontar o volume de resina gasto nas mesas de pet.
                    </p>
                  </div>
                  <Button type="button" variante="ghost" className="border border-outline-variant text-xs" onClick={() => adicionarFuroVazado('circulo')}>
                    + Adicionar Furo (Tigela)
                  </Button>
                </div>

                {furos.map((furo, idx) => (
                  <div key={furo.id} className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-center bg-surface p-2 rounded border border-outline-variant/40">
                    <TextField
                      id={`furo-qtd-${furo.id}`}
                      rotulo={`Qtd Furos #${idx + 1}`}
                      type="number"
                      value={furo.quantidade}
                      onChange={(e) => atualizarFuroVazado(furo.id, 'quantidade', e.target.value)}
                    />
                    <TextField
                      id={`furo-diam-${furo.id}`}
                      rotulo="Diâmetro (cm)"
                      type="number"
                      value={furo.diametroCm}
                      onChange={(e) => atualizarFuroVazado(furo.id, 'diametroCm', e.target.value)}
                    />
                    <TextField
                      id={`furo-prof-${furo.id}`}
                      rotulo="Profundidade (cm - opcional)"
                      type="number"
                      placeholder={profundidade || '3'}
                      value={furo.profundidadeCm}
                      onChange={(e) => atualizarFuroVazado(furo.id, 'profundidadeCm', e.target.value)}
                    />
                    <div className="flex items-end h-full">
                      <Button type="button" variante="ghost" onClick={() => removerFuroVazado(furo.id)} className="text-error text-xs">
                        Excluir Furo
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Margem de segurança */}
              <div className="w-full sm:w-64">
                <TextField
                  id="margem-seguranca"
                  rotulo="Margem de Segurança (%)"
                  type="number"
                  value={margemSeguranca}
                  onChange={(e) => setMargemSeguranca(e.target.value)}
                />
              </div>
            </div>
          )}
          {geometria === 'cilindrico' && (
            <>
              <TextField id="raio-forma" rotulo="Raio (cm)" type="number" value={raio} onChange={(e) => setRaio(e.target.value)} />
              <TextField id="altura-forma" rotulo="Altura (cm)" type="number" value={altura} onChange={(e) => setAltura(e.target.value)} />
            </>
          )}
          {geometria === 'esferico' && (
            <TextField id="raio-forma-esferica" rotulo="Raio (cm)" type="number" value={raio} onChange={(e) => setRaio(e.target.value)} />
          )}
          {geometria === 'direto' && (
            <TextField id="volume-forma" rotulo="Volume (ml)" type="number" value={volumeMl} onChange={(e) => setVolumeMl(e.target.value)} />
          )}

          {resultadoMesaResina ? (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 flex flex-col gap-2.5">
              <h4 className="text-sm font-semibold text-primary flex items-center gap-1.5">
                📊 Cálculo Técnico de Resina da Mesa Comedouro
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-on-surface">
                <div>
                  <span>Volume Bruto do Tampo:</span> <strong>{resultadoMesaResina.volumeBrutoTampoMl.toFixed(0)} ml</strong>
                </div>
                <div>
                  <span>Desconto dos Furos Vazados:</span> <strong className="text-error">-{resultadoMesaResina.volumeVazadosMl.toFixed(0)} ml</strong>
                </div>
                {resultadoMesaResina.volumePesMl > 0 && (
                  <div>
                    <span>Volume dos Pés:</span> <strong>+{resultadoMesaResina.volumePesMl.toFixed(0)} ml</strong>
                  </div>
                )}
                <div>
                  <span>Volume Líquido Sem Margem:</span> <strong>{resultadoMesaResina.volumeLiquidoResinaMl.toFixed(0)} ml</strong>
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-primary/20 flex flex-wrap gap-4 items-center">
                <div className="bg-surface px-3 py-2 rounded border border-primary/20 flex items-center gap-2">
                  <span className="text-xl">💧</span>
                  <div>
                    <p className="text-[10px] text-on-surface-variant uppercase font-medium">Volume Estimado em Litros</p>
                    <p className="text-base font-bold text-primary">{resultadoMesaResina.litrosResina.toFixed(2)} Litros</p>
                  </div>
                </div>
                <div className="bg-surface px-3 py-2 rounded border border-primary/20 flex items-center gap-2">
                  <span className="text-xl">⚖️</span>
                  <div>
                    <p className="text-[10px] text-on-surface-variant uppercase font-medium">Massa Estimada em Quilos</p>
                    <p className="text-base font-bold text-primary">{resultadoMesaResina.massaResinaKg.toFixed(2)} kg</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-on-surface-variant">
              Volume calculado: <strong className="text-on-surface">{volumeCalculado !== null ? `${volumeCalculado.toFixed(1)} ml (${(volumeCalculado / 1000).toFixed(2)} L · ${((volumeCalculado / 1000) * 1.1).toFixed(2)} kg)` : '—'}</strong>
            </p>
          )}

          <div className="mt-3 pt-3 border-t border-outline-variant flex flex-col gap-3">
            <h3 className="text-sm font-semibold text-on-surface">Fabricação & Amortização do Molde (Silicone)</h3>
            
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <label htmlFor="silicone-material" className="text-sm font-medium text-on-surface">Silicone Utilizado do Estoque</label>
                <button
                  type="button"
                  onClick={() => setMostrarTodosMateriais((prev) => !prev)}
                  className="text-xs text-primary hover:underline font-medium"
                >
                  {mostrarTodosMateriais ? '🔍 Filtrar apenas silicones' : '🌐 Mostrar todos os materiais do estoque'}
                </button>
              </div>
              <select
                id="silicone-material"
                value={materialSiliconeId}
                onChange={(e) => setMaterialSiliconeId(e.target.value)}
                className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              >
                <option value="">Nenhum (custo avulso)</option>
                {materiaisSilicone.map((mat) => (
                  <option key={mat.id} value={mat.id}>
                    {mat.nome} ({mat.quantidadeEstoque} {mat.unidade} em estoque · R$ {mat.custoUnitario.toFixed(2)}/{mat.unidade})
                  </option>
                ))}
              </select>
            </div>

            {materialSiliconeId !== '' && (
              <TextField
                id="qtd-silicone"
                rotulo="Quantidade de Silicone Usada (subtraída do estoque)"
                type="number"
                value={qtdSilicone}
                onChange={(e) => setQtdSilicone(e.target.value)}
              />
            )}

            {/* Caixa de Contenção / Estrutura Externa da Forma */}
            <div className="rounded-lg border border-outline-variant/60 bg-surface-variant/10 p-3 flex flex-col gap-2">
              <h4 className="text-xs font-semibold text-on-surface flex items-center gap-1.5">
                🪵 Caixa de Contenção / Estrutura da Forma (Madeira, MDF, Papelão ou Acrílico)
              </h4>
              <p className="text-[11px] text-on-surface-variant">
                Informe o material e custo da caixa externa que segura o silicone líquido ao redor da mesa/modelo.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <TextField
                  id="material-caixa-estrutura"
                  rotulo="Material da Caixa/Estrutura (ex: Madeira / MDF, Papelão)"
                  placeholder="Ex: MDF 15mm / Madeira"
                  value={materialCaixaEstrutura}
                  onChange={(e) => setMaterialCaixaEstrutura(e.target.value)}
                />
                <TextField
                  id="custo-caixa-estrutura"
                  rotulo="Custo da Caixa/Estrutura (R$)"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={custoCaixaEstrutura}
                  onChange={(e) => setCustoCaixaEstrutura(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <TextField
                id="custo-fabricacao-forma"
                rotulo="Custo de Fabricação Total (R$)"
                type="number"
                step="0.01"
                value={custoFabricacao}
                onChange={(e) => setCustoFabricacao(e.target.value)}
              />
              <TextField
                id="vida-util-forma"
                rotulo="Vida Útil (usos)"
                type="number"
                value={vidaUtilUsos}
                onChange={(e) => setVidaUtilUsos(e.target.value)}
              />
              <div className="flex flex-col gap-1">
                <label htmlFor="cura-horas-forma" className="text-sm font-medium text-on-surface">Tempo de Cura do Molde</label>
                <select
                  id="cura-horas-forma"
                  value={curaHoras}
                  onChange={(e) => setCuraHoras(e.target.value)}
                  className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="0">Sem tempo de cura (já pronto)</option>
                  <option value="4">4 horas</option>
                  <option value="12">12 horas</option>
                  <option value="24">24 horas (padrão silicone)</option>
                  <option value="48">48 horas</option>
                </select>
              </div>
            </div>

            {custoPorUsoCalculado && (
              <p className="text-xs text-primary font-medium">
                Amortização por uso no preço final da peça: <strong>R$ {custoPorUsoCalculado} / uso</strong> (R$ {custoFabricacao} ÷ {vidaUtilUsos} usos)
              </p>
            )}
          </div>

          {erro && <p role="alert" className="text-sm text-error">{erro}</p>}
          <div className="flex gap-2">
            <Button type="submit" disabled={volumeCalculado === null || volumeCalculado <= 0 || !nome.trim()}>
              {formaEmEdicaoId !== null ? 'Salvar' : 'Cadastrar forma'}
            </Button>
            {formaEmEdicaoId !== null && (
              <Button type="button" variante="ghost" onClick={limparFormulario}>Cancelar edição</Button>
            )}
          </div>
        </form>
      </Card>

      <section>
        <h2 className="mb-4 text-sm font-semibold text-on-surface">Moldes Cadastrados</h2>
        {formas.length === 0 ? (
          <EmptyState titulo="Nenhuma forma cadastrada" descricao="Cadastre o primeiro molde do seu ateliê." />
        ) : (
          <div className="relative pl-6 sm:pl-32 flex flex-col gap-5 before:absolute before:left-2.5 sm:before:left-[108px] before:top-3 before:bottom-3 before:w-[2px] before:bg-outline-variant/40 before:border-r before:border-dashed before:border-outline-variant/60">
            {formas.map((forma) => {
              const custoPorUso = forma.custoFabricacao && forma.vidaUtilUsos && forma.vidaUtilUsos > 0
                ? (forma.custoFabricacao / forma.vidaUtilUsos).toFixed(2)
                : null
              const usos = forma.usosRealizados ?? 0
              const limite = forma.vidaUtilUsos ?? 50
              const restantes = Math.max(0, limite - usos)
              const ehCurando = forma.status === 'curando'

              return (
                <div key={forma.id} className="relative flex flex-col sm:flex-row items-start gap-4">
                  {/* Rótulo Esquerda (Desktop) */}
                  <div className="hidden sm:flex flex-col items-end w-24 shrink-0 pt-1 text-right">
                    <span className="text-xs font-semibold text-on-surface uppercase tracking-wider">
                      MOLDE
                    </span>
                    <span className="text-[11px] text-on-surface-variant font-mono">
                      #{forma.id}
                    </span>
                  </div>

                  {/* Marcador Central (Node Dot) */}
                  <div className="absolute -left-6 sm:static sm:left-auto pt-1 shrink-0 z-10">
                    <div
                      className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shadow-sm ${
                        ehCurando
                          ? 'border-warning bg-warning/20 text-warning'
                          : 'border-primary bg-primary/20 text-primary'
                      }`}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    </div>
                  </div>

                  {/* Card de Conteúdo à Direita */}
                  <Card className="flex-1 w-full glow-hover flex flex-col gap-2">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-outline-variant/30 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="sm:hidden text-xs font-semibold uppercase text-on-surface">
                          MOLDE #{forma.id}
                        </span>
                        {ehCurando ? (
                          <Badge variant="warning">🧪 Em Cura ({forma.curaMinutos ? `${forma.curaMinutos / 60}h` : 'aguardando'})</Badge>
                        ) : (
                          <Badge variant="success">✓ Pronto / Em Uso</Badge>
                        )}
                        {custoPorUso && (
                          <span className="text-[11px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                            R$ {custoPorUso} / uso
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-on-surface-variant font-mono">
                        {ROTULOS_GEOMETRIA[forma.geometria]}
                      </span>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                      <div>
                        <h3 className="font-semibold text-base text-on-surface">{forma.nome}</h3>
                        <p className="mt-0.5 text-xs text-on-surface-variant">
                          {ROTULOS_GEOMETRIA[forma.geometria]} · {resumoDimensoes(forma)} · {forma.volumeDiretoMl?.toFixed(1) ?? '—'} ml
                          {forma.litrosResina ? ` (${forma.litrosResina.toFixed(2)} L / ${forma.massaResinaKg?.toFixed(2)} kg)` : ''}
                        </p>
                        {forma.custoFabricacao !== undefined && (
                          <p className="mt-1 text-xs text-on-surface-variant">
                            Fabricação: R$ {forma.custoFabricacao.toFixed(2)}
                            {forma.materialCaixaEstrutura ? ` (Estrutura: ${forma.materialCaixaEstrutura}${forma.custoCaixaEstrutura !== undefined ? ` - R$ ${forma.custoCaixaEstrutura.toFixed(2)}` : ''})` : ''} · Usos: <strong>{usos} / {limite}</strong> ({restantes} restantes)
                          </p>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {ehCurando && (
                          <Button
                            variante="primary"
                            className="text-xs"
                            onClick={() => forma.id !== undefined && handleFinalizarCura(forma.id)}
                          >
                            ✓ Confirmar Cura Concluída
                          </Button>
                        )}
                        <Button variante="ghost" className="text-xs" onClick={() => iniciarEdicao(forma)}>Editar</Button>
                        <Button variante="ghost" className="text-xs text-error hover:bg-error/10" onClick={() => setFormaExcluindoId(forma.id ?? null)}>Excluir</Button>
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
        aberto={formaExcluindoId !== null}
        titulo="Excluir forma?"
        descricao="Isso não afeta peças já criadas com esta forma."
        onConfirmar={() => formaExcluindoId !== null && handleExcluir(formaExcluindoId)}
        onCancelar={() => setFormaExcluindoId(null)}
      />
    </div>
  )
}
