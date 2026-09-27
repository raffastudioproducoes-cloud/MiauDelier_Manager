import { db, type StatusPeca, type TipoTransacao, type CavidadeForma } from '../db/schema'
import { cifrarCampo } from './camposCifrados'

export interface RelatorioImportacaoGestoraX {
  categorias: number
  materiais: number
  formas: number
  equipamentos: number
  taxas: number
  pecas: number
  consumos: number
  eventos: number
  contas: number
  transacoes: number
  notificacoes: number
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
    if (!ehObjeto(parsed)) return false

    const app = String(parsed.aplicacao ?? '').toLowerCase()
    if (app === 'gestorax' || app === 'nexora-erp-pro' || app.includes('gestorax') || app.includes('nexora')) {
      return true
    }

    if (ehObjeto(parsed.dados)) {
      const chaves = Object.keys(parsed.dados)
      if (chaves.includes('consumosPeca') || chaves.includes('eventosPeca') || chaves.includes('perfilUsuario')) {
        return true
      }
    }

    return false
  } catch {
    return false
  }
}

/**
 * Importa (mescla, sem apagar dados atuais) um backup do GestoraX — schema e criptografia
 * diferentes do MiauDelier, convertendo tabela por tabela com mapeamento completo dos campos.
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
    equipamentos: 0,
    taxas: 0,
    pecas: 0,
    consumos: 0,
    eventos: 0,
    contas: 0,
    transacoes: 0,
    notificacoes: 0,
    ignorados: [],
  }

  const mapaCategoria = new Map<string, number>()
  const mapaMaterial = new Map<number, number>()
  const mapaForma = new Map<number, number>()
  const mapaEquipamento = new Map<number, number>()
  const mapaPeca = new Map<number, number>()
  const mapaConta = new Map<number, number>()

  const categoriasOrigem = dados.categoriasMaterial ?? []
  const materiaisOrigem = dados.materiais ?? []
  const formasOrigem = dados.formas ?? []
  const equipamentosOrigem = dados.equipamentos ?? []
  const taxasOrigem = dados.taxas ?? []
  const pecasOrigem = dados.pecas ?? []
  const consumosOrigem = dados.consumosPeca ?? []
  const eventosOrigem = dados.eventosPeca ?? []
  const contasOrigem = dados.contas ?? []
  const transacoesOrigem = dados.transacoes ?? []
  const notificacoesOrigem = dados.notificacoes ?? []
  const configsOrigem = dados.configuracoes ?? []

  // Criptografia WebCrypto de contas e transações fora do bloco de transação Dexie
  const saldosCifrados = await Promise.all(
    contasOrigem.map((conta) => cifrarCampo(String(Number(conta.saldoInicial) || 0))),
  )
  const valoresCifrados = await Promise.all(
    transacoesOrigem.map((transacao) => cifrarCampo(String(Number(transacao.valor) || 0))),
  )

  await db.transaction(
    'rw',
    [
      db.categoriasMaterial,
      db.materiais,
      db.formas,
      db.equipamentos,
      db.taxas,
      db.pecas,
      db.consumosPeca,
      db.eventosPeca,
      db.contas,
      db.transacoes,
      db.notificacoes,
      db.configuracoes,
    ],
    async () => {
      // 1. Categorias
      for (const cat of categoriasOrigem) {
        const nome = String(cat.nome ?? 'Sem categoria')
        if (!mapaCategoria.has(nome)) {
          const catExistente = await db.categoriasMaterial.where('nome').equals(nome).first()
          if (catExistente && catExistente.id !== undefined) {
            mapaCategoria.set(nome, catExistente.id)
          } else {
            const novoId = (await db.categoriasMaterial.add({ nome })) as number
            mapaCategoria.set(nome, novoId)
            relatorio.categorias += 1
          }
        }
      }

      // 2. Materiais
      for (const material of materiaisOrigem) {
        const idOrigem = Number(material.id)
        const nomeCategoria = String(material.subcategoria || material.categoria || 'Sem categoria')
        let categoriaId = mapaCategoria.get(nomeCategoria)
        if (categoriaId === undefined) {
          const catExistente = await db.categoriasMaterial.where('nome').equals(nomeCategoria).first()
          if (catExistente && catExistente.id !== undefined) {
            categoriaId = catExistente.id
          } else {
            categoriaId = (await db.categoriasMaterial.add({ nome: nomeCategoria })) as number
            relatorio.categorias += 1
          }
          mapaCategoria.set(nomeCategoria, categoriaId)
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

      // 3. Formas
      for (const forma of formasOrigem) {
        const idOrigem = Number(forma.id)
        const comp = Number(forma.comprimentoCm) || 0
        const larg = Number(forma.larguraCm) || 0
        const alt = Number(forma.alturaCm) || 0
        const temDimensoes = comp > 0 && larg > 0 && alt > 0

        const novoId = (await db.formas.add({
          nome: String(forma.nome ?? 'Forma importada'),
          geometria: temDimensoes ? 'retangular' : 'direto',
          dimensoesCm: temDimensoes ? { comprimento: comp, largura: larg, profundidade: alt } : {},
          volumeDiretoMl: Number(forma.volumeMl) || 0,
          custoFabricacao: Number(forma.custoFabricacao) || 0,
          vidaUtilUsos: Number(forma.vidaUtilUsos) || 0,
          usosRealizados: Number(forma.usosRealizados) || 0,
          ...(Array.isArray(forma.cavidades) ? { cavidades: forma.cavidades as CavidadeForma[] } : {}),
        })) as number
        mapaForma.set(idOrigem, novoId)
        relatorio.formas += 1
      }

      // 4. Equipamentos
      for (const eq of equipamentosOrigem) {
        const idOrigem = Number(eq.id)
        const novoId = (await db.equipamentos.add({
          nome: String(eq.nome ?? 'Equipamento importado'),
          potenciaWatts: Number(eq.potenciaWatts) || 0,
          criadoEm: paraIso(eq.criadoEm),
        })) as number
        mapaEquipamento.set(idOrigem, novoId)
        relatorio.equipamentos += 1
      }

      // 5. Taxas
      for (const t of taxasOrigem) {
        await db.taxas.add({
          nome: String(t.nome ?? 'Taxa importada'),
          percentual: Number(t.percentual) || 0,
          valorFixo: Number(t.valorFixo) || 0,
          criadoEm: paraIso(t.criadoEm),
        })
        relatorio.taxas += 1
      }

      // 6. Peças
      for (const peca of pecasOrigem) {
        const idOrigem = Number(peca.id)
        const formaIdOrigem = peca.formaId === undefined || peca.formaId === null ? undefined : Number(peca.formaId)
        const formaId = formaIdOrigem === undefined ? 0 : (mapaForma.get(formaIdOrigem) ?? 0)

        const status = MAPA_STATUS_PECA[String(peca.status)] ?? 'planejada'
        const precoVenda = typeof peca.precoVenda === 'number' ? peca.precoVenda : undefined

        const usosEnergiaOrigem = Array.isArray(peca.usosEnergia) ? peca.usosEnergia : []
        const usosEnergia = usosEnergiaOrigem.map((u) => {
          const item = u as Record<string, unknown>
          const eqIdOrigem = Number(item.equipamentoId)
          return {
            equipamentoId: mapaEquipamento.get(eqIdOrigem) ?? eqIdOrigem,
            nomeEquipamento: String(item.nomeEquipamento ?? ''),
            potenciaWatts: Number(item.potenciaWatts) || 0,
            minutosUso: Number(item.minutosUso) || 0,
          }
        })

        const novoId = (await db.pecas.add({
          nome: String(peca.nome ?? 'Peça importada'),
          numeroSerie: peca.numeroSerie ? String(peca.numeroSerie) : undefined,
          formaId,
          status,
          criadaEm: paraIso(peca.criadoEm),
          ...(precoVenda !== undefined ? { precoVenda } : {}),
          horasMaoDeObra: typeof peca.horasMaoDeObra === 'number' ? peca.horasMaoDeObra : undefined,
          maoDeObraFixa: typeof peca.maoDeObraFixa === 'number' ? peca.maoDeObraFixa : undefined,
          usosEnergia: usosEnergia.length > 0 ? usosEnergia : undefined,
          percentualTaxas: typeof peca.percentualTaxas === 'number' ? peca.percentualTaxas : undefined,
          margemDesejada: typeof peca.margemDesejada === 'number' ? peca.margemDesejada : undefined,
          curaIniciadaEm: typeof peca.curaIniciadaEm === 'number' ? peca.curaIniciadaEm : undefined,
          curaMinutos: typeof peca.curaMinutos === 'number' ? peca.curaMinutos : undefined,
          tipoProcesso: peca.tipoProcesso ? String(peca.tipoProcesso) : undefined,
          duracaoProcessoMinutos: typeof peca.duracaoProcessoMinutos === 'number' ? peca.duracaoProcessoMinutos : undefined,
        })) as number
        mapaPeca.set(idOrigem, novoId)
        relatorio.pecas += 1
      }

      // 7. Consumos de Peça
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

      // 8. Eventos de Peça
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

      // 9. Contas
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

      // 10. Transações
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

      // 11. Notificações
      for (const n of notificacoesOrigem) {
        await db.notificacoes.add({
          titulo: String(n.titulo ?? 'Notificação'),
          mensagem: String(n.mensagem ?? ''),
          lida: Boolean(n.lida),
          criadoEm: paraIso(n.criadoEm),
        })
        relatorio.notificacoes += 1
      }

      // 12. Configurações e Perfil do Usuário
      for (const cfg of configsOrigem) {
        if (ehObjeto(cfg)) {
          for (const [chave, val] of Object.entries(cfg)) {
            if (chave !== 'id' && val !== undefined && val !== null) {
              const reg = await db.configuracoes.where('chave').equals(chave).first()
              if (reg) {
                await db.configuracoes.update(reg.id!, { valor: String(val) })
              } else {
                await db.configuracoes.add({ chave, valor: String(val) })
              }
            }
          }
        }
      }
    },
  )

  return relatorio
}

