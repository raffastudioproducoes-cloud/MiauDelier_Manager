import { db, type LogSistema, type NivelLog } from '../db/schema'

// Expressões regulares e nomes de propriedades sensíveis para higienização estrita
const CHAVES_SENSIVEIS_REGEX =
  /(senha|password|hash|salt|key|token|secret|sessao|session|cifrado|chavedesessao|auth|authorization|pin|jwt|private|credenciais|creditcard|cartao|cvv|cpf|rg|saldoCriptografado|valorCriptografado)/i

const CHAVE_HEX_REGEX = /^[0-9a-fA-F]{64}$/
const BASE64_CIPHERTEXT_REGEX = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/

const LIMITE_MAXIMO_LOGS = 1000
const bufferLogsMemoria: LogSistema[] = []

/**
 * Sanitiza recursivamente objetos, strings, arrays e estruturas de dados,
 * garantindo que senhas, chaves de criptografia, hashes, tokens e dados sensíveis
 * JAMAIS sejam gravados nos arquivos de log da aplicação.
 */
export function sanitizarDadoLog(dado: unknown, profundidade = 0): unknown {
  if (dado === null || dado === undefined) return dado
  if (profundidade > 6) return '[Profundidade Máxima de Inspeção Excedida]'

  if (typeof dado === 'string') {
    // Omite se a string tiver formato de chave criptográfica de 256-bit (hex)
    if (CHAVE_HEX_REGEX.test(dado)) {
      return '[CHAVE_CRIPTOGRAFICA_OMITIDA]'
    }
    // Omite strings base64 longas que parecem ser payloads cifrados
    if (dado.length > 80 && BASE64_CIPHERTEXT_REGEX.test(dado)) {
      return '[PAYLOAD_CIFRADO_OMITIDO]'
    }
    // Se a string contiver JSON serializado, analisa e sanitiza internamente
    if (dado.startsWith('{') || dado.startsWith('[')) {
      try {
        const JSONParsed = JSON.parse(dado)
        return JSON.stringify(sanitizarDadoLog(JSONParsed, profundidade + 1))
      } catch {
        // não é um JSON válido
      }
    }
    return dado
  }

  if (typeof dado === 'number' || typeof dado === 'boolean') {
    return dado
  }

  if (Array.isArray(dado)) {
    return dado.map((item) => sanitizarDadoLog(item, profundidade + 1))
  }

  if (dado instanceof Error) {
    return {
      nome: dado.name,
      mensagem: sanitizarDadoLog(dado.message, profundidade + 1),
      stack: sanitizarDadoLog(dado.stack, profundidade + 1),
    }
  }

  if (typeof dado === 'object') {
    const objetoSanitizado: Record<string, unknown> = {}
    for (const [chave, valor] of Object.entries(dado as Record<string, unknown>)) {
      if (CHAVES_SENSIVEIS_REGEX.test(chave)) {
        objetoSanitizado[chave] = '[REDACTED]'
      } else {
        objetoSanitizado[chave] = sanitizarDadoLog(valor, profundidade + 1)
      }
    }
    return objetoSanitizado
  }

  return String(dado)
}

/**
 * Registra um evento no log do sistema, mantendo persistência no Dexie DB (se aberto)
 * e mantendo buffer em memória para recuperabilidade imediata.
 */
export async function registrarLog(
  nivel: NivelLog,
  origem: string,
  mensagem: string,
  detalhes?: unknown,
  stack?: string,
): Promise<LogSistema> {
  const detalhesSanitizados =
    detalhes !== undefined
      ? (sanitizarDadoLog(detalhes) as Record<string, unknown> | string)
      : undefined

  const stackSanitizada = stack ? (sanitizarDadoLog(stack) as string) : undefined

  const logItem: LogSistema = {
    timestamp: new Date().toISOString(),
    nivel,
    origem: (sanitizarDadoLog(origem) as string) || 'geral',
    mensagem: (sanitizarDadoLog(mensagem) as string) || '',
    detalhes: detalhesSanitizados,
    stack: stackSanitizada,
  }

  // Adiciona ao buffer em memória
  bufferLogsMemoria.unshift(logItem)
  if (bufferLogsMemoria.length > LIMITE_MAXIMO_LOGS) {
    bufferLogsMemoria.pop()
  }

  // Tenta persistir no banco de dados local IndexedDB
  try {
    if (db && db.isOpen()) {
      await db.logs.add(logItem)

      // Purga logs antigos caso exceda o limite configurado
      const total = await db.logs.count()
      if (total > LIMITE_MAXIMO_LOGS) {
        const registrosAntigos = await db.logs.orderBy('id').limit(total - LIMITE_MAXIMO_LOGS).toArray()
        const idsAntigos = registrosAntigos.map((l) => l.id).filter((id): id is number => id !== undefined)
        await db.logs.bulkDelete(idsAntigos)
      }
    }
  } catch {
    // Erro ao persistir o log no banco não deve quebrar a execução da aplicação
  }

  return logItem
}

export function logInfo(origem: string, mensagem: string, detalhes?: unknown) {
  return registrarLog('info', origem, mensagem, detalhes)
}

export function logWarn(origem: string, mensagem: string, detalhes?: unknown) {
  return registrarLog('warn', origem, mensagem, detalhes)
}

export function logError(origem: string, mensagem: string, erroOuDetalhes?: unknown, stack?: string) {
  let stackExtra = stack
  if (!stackExtra && erroOuDetalhes instanceof Error) {
    stackExtra = erroOuDetalhes.stack
  }
  return registrarLog('error', origem, mensagem, erroOuDetalhes, stackExtra)
}

export function logDebug(origem: string, mensagem: string, detalhes?: unknown) {
  return registrarLog('debug', origem, mensagem, detalhes)
}

/**
 * Consulta logs registrados no sistema com suporte a filtros por nível e busca por texto.
 */
export async function listarLogsSistema(filtro?: {
  nivel?: NivelLog | 'todos'
  busca?: string
  limite?: number
}): Promise<LogSistema[]> {
  let logs: LogSistema[]

  try {
    if (db && db.isOpen()) {
      logs = await db.logs.orderBy('timestamp').reverse().toArray()
    } else {
      logs = [...bufferLogsMemoria]
    }
  } catch {
    logs = [...bufferLogsMemoria]
  }

  // Se o banco estiver vazio, usa os logs do buffer em memória
  if (logs.length === 0 && bufferLogsMemoria.length > 0) {
    logs = [...bufferLogsMemoria]
  }

  if (filtro?.nivel && filtro.nivel !== 'todos') {
    logs = logs.filter((l) => l.nivel === filtro.nivel)
  }

  if (filtro?.busca && filtro.busca.trim() !== '') {
    const termo = filtro.busca.toLowerCase().trim()
    logs = logs.filter(
      (l) =>
        l.mensagem.toLowerCase().includes(termo) ||
        l.origem.toLowerCase().includes(termo) ||
        (l.stack && l.stack.toLowerCase().includes(termo)) ||
        (l.detalhes && JSON.stringify(l.detalhes).toLowerCase().includes(termo)),
    )
  }

  if (filtro?.limite && filtro.limite > 0) {
    logs = logs.slice(0, filtro.limite)
  }

  return logs
}

/**
 * Limpa todos os logs do banco de dados e da memória.
 */
export async function limparLogsSistema(): Promise<void> {
  bufferLogsMemoria.length = 0
  try {
    if (db && db.isOpen()) {
      await db.logs.clear()
    }
  } catch {
    // ignora
  }
}

/**
 * Formata os logs em texto legível para exportação e inspeção.
 */
export function exportarLogsComoTexto(logs: LogSistema[]): string {
  if (logs.length === 0) return '=== NENHUM LOG REGISTRADO ==='

  return logs
    .map((l) => {
      const detalhesStr = l.detalhes ? `\n  Detalhes: ${JSON.stringify(l.detalhes, null, 2)}` : ''
      const stackStr = l.stack ? `\n  Stack: ${l.stack}` : ''
      return `[${l.timestamp}] [${l.nivel.toUpperCase()}] [Origem: ${l.origem}] ${l.mensagem}${detalhesStr}${stackStr}`
    })
    .join('\n--------------------------------------------------------------------------------\n')
}

/**
 * Exporta os logs em formato JSON estruturado.
 */
export function exportarLogsComoJSON(logs: LogSistema[]): string {
  return JSON.stringify(logs, null, 2)
}

let globalListenersConfigurados = false

/**
 * Captura exceções síncronas e assíncronas não tratadas (silenciosas) da aplicação.
 */
export function inicializarLoggerGlobal(): void {
  if (globalListenersConfigurados || typeof window === 'undefined') return

  globalListenersConfigurados = true

  // Erros de runtime em scripts / handlers de eventos
  window.addEventListener('error', (event) => {
    logError(
      'global_error',
      event.message || 'Erro não tratado na aplicação',
      {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
      event.error?.stack,
    )
  })

  // Falhas silenciosas em chamadas assíncronas (Promises não tratadas)
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason
    const mensagem = reason instanceof Error ? reason.message : String(reason || 'Rejeição de Promise não tratada')
    const stack = reason instanceof Error ? reason.stack : undefined

    logError('unhandled_rejection', mensagem, reason, stack)
  })

  logInfo('sistema', 'Logger de eventos e falhas ativado com sucesso')
}
