import { db, type StatusPeca, type TipoTransacao } from '../db/schema'
import { cifrarCampo } from './camposCifrados'

export interface RelatorioImportacaoGestoraX {
  categorias: number
  materiais: number
  formas: number
  pecas: number
  consumos: number
  eventos: number
  contas: number
  transacoes: number
  ignorados: string[]
}

const MAPA_STATUS_PECA: Record<string, StatusPeca> = {
  criada: 'planejada',
  preparacao: 'planejada',
  producao: 'em_producao',
  cura: 'curando',
  finalizada: 'pronta',
  vendida: 'vendida',
}

const MAPA_TIPO_TRANSACAO: Record<string, TipoTransacao> = {
  entrada: 'entrada',
  saida: 'saida',
}

function ehObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor)
}

function paraIso(timestampMs: unknown): string {
  const numero = typeof timestampMs === 'number' && Number.isFinite(timestampMs) ? timestampMs : Date.now()
  return new Date(numero).toISOString()
}

export function ehBackupGestoraX(json: string): boolean {
  try {
    const parsed = JSON.parse(json)
    return ehObjeto(parsed) && (parsed.aplicacao === 'gestorax' || parsed.aplicacao === 'nexora-erp-pro')
  } catch {
    return false
  }
}

/**
 * Importa (mescla, sem apagar dados atuais) um backup do GestoraX — schema e criptografia
 * diferentes do MiauDelier, então cada tabela é convertida campo a campo em vez de reaproveitar
 * o pipeline de restauração nativo (que espera o próprio formato e substitui tudo).
 */
export async function importarBackupGestoraX(json: string): Promise<RelatorioImportacaoGestoraX> {
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    throw new Error('Arquivo inválido: não é um JSON válido.')
  }
  if (!ehObjeto(parsed) || !ehObjeto(parsed.dados)) {
    throw new Error('Arquivo inválido: não parece um backup do GestoraX.')
  }
  const dados = parsed.dados as Record<string, Record<string, unknown>[]>

  const relatorio: RelatorioImportacaoGestoraX = {
    categorias: 0,
    materiais: 0,
    formas: 0,
    pecas: 0,
    consumos: 0,
    eventos: 0,
    contas: 0,
    transacoes: 0,
    ignorados: [],
  }

  const mapaCategoria = new Map<string, number>()
  const mapaMaterial = new Map<number, number>()
  const mapaForma = new Map<number, number>()
  const mapaPeca = new Map<number, number>()
  const mapaConta = new Map<number, number>()

  const materiaisOrigem = dados.materiais ?? []
  const formasOrigem = dados.formas ?? []
  const pecasOrigem = dados.pecas ?? []
  const consumosOrigem = dados.consumosPeca ?? []
  const eventosOrigem = dados.eventosPeca ?? []
  const contasOrigem = dados.contas ?? []
  const transacoesOrigem = dados.transacoes ?? []

  // WebCrypto roda fora da transação Dexie — só as escritas entram nela.
  const saldosCifrados = await Promise.all(
    contasOrigem.map((conta) => cifrarCampo(String(Number(conta.saldoInicial) || 0))),
  )
  const valoresCifrados = await Promise.all(
    transacoesOrigem.map((transacao) => cifrarCampo(String(Number(transacao.valor) || 0))),
  )

  await db.transaction(
    'rw',
    [db.categoriasMaterial, db.materiais, db.formas, db.pecas, db.consumosPeca, db.eventosPeca, db.contas, db.transacoes],
    async () => {
      for (const material of materiaisOrigem) {
        const idOrigem = Number(material.id)
        const nomeCategoria = String(material.subcategoria || material.categoria || 'Sem categoria')
        let categoriaId = mapaCategoria.get(nomeCategoria)
        if (categoriaId === undefined) {
          categoriaId = (await db.categoriasMaterial.add({ nome: nomeCategoria })) as number
          mapaCategoria.set(nomeCategoria, categoriaId)
          relatorio.categorias += 1
        }
        const novoId = (await db.materiais.add({
          nome: String(material.nome ?? 'Material importado'),
          categoriaId,
          unidade: String(material.unidade ?? 'un'),
          quantidadeEstoque: Number(material.estoqueAtual) || 0,
          custoUnitario: Number(material.custoPorUnidade) || 0,
        })) as number
        mapaMaterial.set(idOrigem, novoId)
        relatorio.materiais += 1
      }

      for (const forma of formasOrigem) {
        const idOrigem = Number(forma.id)
        const novoId = (await db.formas.add({
          nome: String(forma.nome ?? 'Forma importada'),
          geometria: 'direto',
          dimensoesCm: {},
          volumeDiretoMl: Number(forma.volumeMl) || 0,
        })) as number
        mapaForma.set(idOrigem, novoId)
        relatorio.formas += 1
      }

      for (const peca of pecasOrigem) {
        const idOrigem = Number(peca.id)
        const formaIdOrigem = peca.formaId === undefined ? undefined : Number(peca.formaId)
        const formaId = formaIdOrigem === undefined ? undefined : mapaForma.get(formaIdOrigem)
        if (formaId === undefined) {
          relatorio.ignorados.push(`Peça "${String(peca.nome ?? idOrigem)}" ignorada: sem forma correspondente.`)
          continue
        }
        const status = MAPA_STATUS_PECA[String(peca.status)] ?? 'planejada'
        const precoVenda = typeof peca.precoVenda === 'number' ? peca.precoVenda : undefined
        const novoId = (await db.pecas.add({
          nome: String(peca.nome ?? 'Peça importada'),
          formaId,
          status,
          criadaEm: paraIso(peca.criadoEm),
          ...(precoVenda !== undefined ? { precoVenda } : {}),
        })) as number
        mapaPeca.set(idOrigem, novoId)
        relatorio.pecas += 1
      }

      for (const consumo of consumosOrigem) {
        const pecaId = mapaPeca.get(Number(consumo.pecaId))
        const materialId = mapaMaterial.get(Number(consumo.materialId))
        if (pecaId === undefined || materialId === undefined) {
          relatorio.ignorados.push('Consumo de material ignorado: peça ou material correspondente não encontrado.')
          continue
        }
        await db.consumosPeca.add({
          pecaId,
          materialId,
          quantidade: Number(consumo.quantidade) || 0,
        })
        relatorio.consumos += 1
      }

      for (const evento of eventosOrigem) {
        const pecaId = evento.pecaId === undefined ? undefined : mapaPeca.get(Number(evento.pecaId))
        if (pecaId === undefined) {
          relatorio.ignorados.push('Evento de produção ignorado: peça correspondente não encontrada.')
          continue
        }
        await db.eventosPeca.add({
          pecaId,
          tipo: String(evento.tipo ?? 'evento'),
          descricao: String(evento.descricao ?? ''),
          criadoEm: paraIso(evento.criadoEm),
        })
        relatorio.eventos += 1
      }

      for (let i = 0; i < contasOrigem.length; i += 1) {
        const conta = contasOrigem[i]
        const idOrigem = Number(conta.id)
        const novoId = (await db.contas.add({
          nome: String(conta.nome ?? 'Conta importada'),
          saldoCriptografado: saldosCifrados[i],
        })) as number
        mapaConta.set(idOrigem, novoId)
        relatorio.contas += 1
      }

      for (let i = 0; i < transacoesOrigem.length; i += 1) {
        const transacao = transacoesOrigem[i]
        const contaIdOrigem = transacao.contaId === undefined ? undefined : Number(transacao.contaId)
        const contaId = contaIdOrigem === undefined ? undefined : mapaConta.get(contaIdOrigem)
        const tipo = MAPA_TIPO_TRANSACAO[String(transacao.tipo)]
        if (contaId === undefined || !tipo) {
          relatorio.ignorados.push(
            `Transação "${String(transacao.descricao ?? '')}" ignorada: sem conta correspondente ou tipo não suportado (transferências não são importadas).`,
          )
          continue
        }
        await db.transacoes.add({
          contaId,
          tipo,
          valorCriptografado: valoresCifrados[i],
          descricao: String(transacao.descricao ?? ''),
          data: paraIso(transacao.data),
        })
        relatorio.transacoes += 1
      }
    },
  )

  return relatorio
}
