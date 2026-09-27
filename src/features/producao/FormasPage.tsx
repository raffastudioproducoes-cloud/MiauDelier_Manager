import { useEffect, useMemo, useRef, useState } from 'react'
import { z } from 'zod'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { TextField } from '../../components/ui/TextField'
import { Badge } from '../../components/ui/Badge'
import { EmptyState } from '../../components/ui/EmptyState'
import { ConfirmModal } from '../../components/ui/ConfirmModal'
import { useToast } from '../../components/ui/useToast'
import { calcularVolumeMl } from '../calculator/volume'
import { criarForma, listarFormas, atualizarForma, excluirForma, finalizarCuraForma } from './formasRepo'
import { listarMateriais } from './materiaisRepo'
import type { Forma, FormaGeometria, Material } from '../../db/schema'

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
  switch (forma.geometria) {
    case 'retangular':
      return `${d.comprimento} × ${d.largura} × ${d.profundidade} cm`
    case 'cilindrico':
      return `raio ${d.raio} cm · altura ${d.altura} cm`
    case 'esferico':
      return `raio ${d.raio} cm`
    case 'direto':
      return 'volume direto'
  }
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

  // Silicone & Amortização do Molde & Cura
  const [materialSiliconeId, setMaterialSiliconeId] = useState('')
  const [qtdSilicone, setQtdSilicone] = useState('')
  const [custoFabricacao, setCustoFabricacao] = useState('')
  const [vidaUtilUsos, setVidaUtilUsos] = useState('50')
  const [curaHoras, setCuraHoras] = useState('24')

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

  // Auto calcula o custo do silicone se selecionado
  useEffect(() => {
    if (materialSiliconeId && qtdSilicone) {
      const mat = materiais.find((m) => String(m.id) === materialSiliconeId)
      const qtd = Number(qtdSilicone)
      if (mat && !isNaN(qtd) && qtd > 0) {
        const calc = (qtd * mat.custoUnitario).toFixed(2)
        setCustoFabricacao(calc)
      }
    }
  }, [materialSiliconeId, qtdSilicone, materiais])

  const volumeCalculado = useMemo(() => {
    try {
      return calcularVolumeMl({
        geometria,
        ...dimensoesGeometria(geometria, { comprimento, largura, profundidade, raio, altura, volumeMl }),
        volumeMl: Number(volumeMl),
      })
    } catch {
      return null
    }
  }, [geometria, comprimento, largura, profundidade, raio, altura, volumeMl])

  const custoPorUsoCalculado = useMemo(() => {
    const c = Number(custoFabricacao)
    const v = Number(vidaUtilUsos)
    if (!isNaN(c) && c > 0 && !isNaN(v) && v > 0) {
      return (c / v).toFixed(2)
    }
    return null
  }, [custoFabricacao, vidaUtilUsos])

  function limparFormulario() {
    setNome('')
    setGeometria('cilindrico')
    setComprimento('')
    setLargura('')
    setProfundidade('')
    setRaio('')
    setAltura('')
    setVolumeMl('')
    setMaterialSiliconeId('')
    setQtdSilicone('')
    setCustoFabricacao('')
    setVidaUtilUsos('50')
    setCuraHoras('24')
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
    setMaterialSiliconeId(forma.materialSiliconeId !== undefined ? String(forma.materialSiliconeId) : '')
    setQtdSilicone(forma.quantidadeSiliconeUsada !== undefined ? String(forma.quantidadeSiliconeUsada) : '')
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

    try {
      const dados = {
        nome: resultado.data.nome,
        geometria,
        dimensoesCm: dimensoesGeometria(geometria, { comprimento, largura, profundidade, raio, altura, volumeMl }),
        volumeDiretoMl: volumeCalculado,
        materialSiliconeId: materialSiliconeId ? Number(materialSiliconeId) : undefined,
        quantidadeSiliconeUsada: qtdSilicone ? Number(qtdSilicone) : undefined,
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
    mostrarToast(formaEmEdicaoId !== null ? 'Forma atualizada com sucesso' : 'Forma cadastrada e silicone abatido do estoque com sucesso')
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
    mostrarToast('Cura do molde finalizada! Agora ele está disponível para produção de peças.')
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
        <p className="text-label-sm text-on-surface-variant">Banco técnico de fabricação de moldes do ateliê.</p>
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
            <>
              <TextField id="comprimento-forma" rotulo="Comprimento (cm)" type="number" value={comprimento} onChange={(e) => setComprimento(e.target.value)} />
              <TextField id="largura-forma" rotulo="Largura (cm)" type="number" value={largura} onChange={(e) => setLargura(e.target.value)} />
              <TextField id="profundidade-forma" rotulo="Profundidade (cm)" type="number" value={profundidade} onChange={(e) => setProfundidade(e.target.value)} />
            </>
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

          <p className="text-sm text-on-surface-variant">
            Volume calculado: <strong className="text-on-surface">{volumeCalculado !== null ? `${volumeCalculado.toFixed(1)} ml` : '—'}</strong>
          </p>

          <div className="mt-3 pt-3 border-t border-outline-variant flex flex-col gap-3">
            <h3 className="text-sm font-semibold text-on-surface">Fabricação & Amortização do Molde (Silicone)</h3>
            
            <div className="flex flex-col gap-1">
              <label htmlFor="silicone-material" className="text-sm font-medium text-on-surface">Silicone Utilizado do Estoque</label>
              <select
                id="silicone-material"
                value={materialSiliconeId}
                onChange={(e) => setMaterialSiliconeId(e.target.value)}
                className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              >
                <option value="">Nenhum (custo avulso)</option>
                {materiais.map((mat) => (
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

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <TextField
                id="custo-fabricacao-forma"
                rotulo="Custo de Fabricação (R$)"
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
        <h2 className="mb-2 text-sm font-semibold text-on-surface">Moldes Cadastrados</h2>
        {formas.length === 0 ? (
          <EmptyState titulo="Nenhuma forma cadastrada" descricao="Cadastre o primeiro molde do seu ateliê." />
        ) : (
          <ul className="flex flex-col gap-3">
            {formas.map((forma) => {
              const custoPorUso = forma.custoFabricacao && forma.vidaUtilUsos && forma.vidaUtilUsos > 0
                ? (forma.custoFabricacao / forma.vidaUtilUsos).toFixed(2)
                : null
              const usos = forma.usosRealizados ?? 0
              const limite = forma.vidaUtilUsos ?? 50
              const restantes = Math.max(0, limite - usos)
              const ehCurando = forma.status === 'curando'

              return (
                <Card key={forma.id} className="glow-hover">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-on-surface">{forma.nome}</h3>
                        {ehCurando ? (
                          <Badge variant="warning">🧪 Em Cura ({forma.curaMinutos ? `${forma.curaMinutos / 60}h` : 'aguardando'})</Badge>
                        ) : (
                          <Badge variant="success">✓ Pronto / Em Uso</Badge>
                        )}
                        {custoPorUso && (
                          <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded">
                            R$ {custoPorUso} / uso
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-label-sm text-on-surface-variant">
                        {ROTULOS_GEOMETRIA[forma.geometria]} · {resumoDimensoes(forma)} · {forma.volumeDiretoMl?.toFixed(1) ?? '—'} ml
                      </p>
                      {forma.custoFabricacao !== undefined && (
                        <p className="mt-1 text-xs text-on-surface-variant">
                          Fabricação: R$ {forma.custoFabricacao.toFixed(2)} · Usos: <strong>{usos} / {limite}</strong> ({restantes} restantes)
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {ehCurando && (
                        <Button
                          variante="primary"
                          onClick={() => forma.id !== undefined && handleFinalizarCura(forma.id)}
                        >
                          ✓ Confirmar Cura Concluída
                        </Button>
                      )}
                      <Button variante="ghost" onClick={() => iniciarEdicao(forma)}>Editar</Button>
                      <Button variante="ghost" onClick={() => setFormaExcluindoId(forma.id ?? null)}>Excluir</Button>
                    </div>
                  </div>
                </Card>
              )
            })}
          </ul>
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
