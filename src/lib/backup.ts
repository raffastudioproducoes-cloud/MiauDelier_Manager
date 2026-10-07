import { db, type MiauDelierDB } from '../db/schema'
import { CHAVE_SALT, deleteUserData } from './auth'
import { useAuthStore } from '../stores/authStore'
import { logInfo, logError } from './logger'

function fnv1aHash(texto: string): string {
  let hash = 0x811c9dc5
  for (let i = 0; i < texto.length; i++) {
    hash ^= texto.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

const TABELAS = [
  'categoriasMaterial',
  'materiais',
  'formas',
  'pecas',
  'consumosPeca',
  'eventosPeca',
  'clientes',
  'pedidos',
  'transacoes',
  'contas',
  'configuracoes',
  'auditoria',
] as const

type Envelope = { app: string; versao: string; dados: Record<string, unknown[]>; checksum: string }

function ehObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor)
}

function validarEnvelope(json: string): Envelope {
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch (err) {
    const msg = 'Arquivo de backup inválido — não é um JSON válido.'
    logError('backup', msg, { erroOriginal: err instanceof Error ? err.message : String(err) })
    throw new Error('arquivo de backup inválido — não é JSON', { cause: err })
  }
  if (!ehObjeto(parsed) || !ehObjeto(parsed.dados) || typeof parsed.checksum !== 'string') {
    const msg = 'Arquivo de backup inválido — esperado um objeto com as propriedades "dados" e "checksum".'
    logError('backup', msg, { estrururaRecebida: Object.keys(parsed || {}) })
    throw new Error(
      'arquivo de backup inválido — esperado um objeto com as propriedades "dados" e "checksum"',
    )
  }
  
  if (parsed.app !== 'MiauDelier_Manager') {
    throw new Error('arquivo de backup inválido — este arquivo não foi gerado pelo MiauDelier Manager.')
  }
  
  return parsed as unknown as Envelope
}

function validarLinhasDaTabela(nomeTabela: string, linhas: unknown[]): void {
  for (const linha of linhas) {
    if (typeof linha !== 'object' || linha === null || Array.isArray(linha)) {
      const msg = `Backup inválido: registro malformado na tabela "${nomeTabela}".`
      logError('backup', msg, { tabela: nomeTabela, linhaInvalida: linha })
      throw new Error(msg)
    }
  }
}

function validarAutenticacao(dados: Record<string, unknown[]>): void {
  const configuracoes = dados.configuracoes
  const chaves = new Set(
    Array.isArray(configuracoes)
      ? configuracoes.map((linha) => (ehObjeto(linha) ? linha.chave : undefined))
      : [],
  )
  if (!chaves.has(CHAVE_SALT)) {
    const msg = 'Backup sem a configuração da conta local.'
    logError('backup', msg, { chavesPresentes: Array.from(chaves) })
    throw new Error(
      'backup sem a configuração da conta local',
    )
  }
}

async function validarContaIgual(dados: Record<string, unknown[]>, dbAlvo: MiauDelierDB): Promise<void> {
  const configuracaoLocal = await dbAlvo.configuracoes.where('chave').equals(CHAVE_SALT).first();
  if (configuracaoLocal) {
    const configuracoesBackup = dados.configuracoes;
    if (Array.isArray(configuracoesBackup)) {
      const configBackupSalt = configuracoesBackup.find(linha => ehObjeto(linha) && linha.chave === CHAVE_SALT) as any;
      if (configBackupSalt && configBackupSalt.valor !== configuracaoLocal.valor) {
        throw new Error('Aviso de Segurança: Este backup pertence a outra conta. Por segurança, só é permitido restaurar backups gerados por esta mesma conta.');
      }
    }
  }
}

export async function exportarBackup(): Promise<string> {
  try {
    const dados: Record<string, unknown[]> = {}
    for (const nomeTabela of TABELAS) {
      dados[nomeTabela] = await db.table(nomeTabela).toArray()
    }

    const dadosSerializados = JSON.stringify(dados)
    const checksum = fnv1aHash(dadosSerializados)
    const criadoEm = new Date().toISOString()

    await db.backups.add({ criadoEm, checksum, tamanhoBytes: dadosSerializados.length })
    await logInfo('backup', 'Backup exportado com sucesso', { checksum, tamanhoBytes: dadosSerializados.length })

    return JSON.stringify({ 
      app: 'MiauDelier_Manager',
      versao: '1.0.0',
      dados, 
      checksum, 
      criadoEm 
    })
  } catch (err) {
    await logError('backup', 'Erro ao exportar backup', err)
    throw err
  }
}

export async function importarBackup(json: string, targetDb?: MiauDelierDB): Promise<void> {
  await logInfo('backup', 'Iniciando validação e restauração de backup JSON MiauDelier', { tamanhoString: json.length })
  const dbAlvo = targetDb || db

  try {
    const parsed = validarEnvelope(json)

    const checksumCalculado = fnv1aHash(JSON.stringify(parsed.dados))
    if (checksumCalculado !== parsed.checksum) {
      const msg = 'Checksum do backup não confere — arquivo corrompido ou alterado.'
      await logError('backup', msg, { checksumEsperado: parsed.checksum, checksumCalculado })
      throw new Error('checksum do backup não confere — arquivo corrompido')
    }

    validarAutenticacao(parsed.dados)
    await validarContaIgual(parsed.dados, dbAlvo)
    for (const nomeTabela of TABELAS) {
      validarLinhasDaTabela(nomeTabela, parsed.dados[nomeTabela] ?? [])
    }

    await dbAlvo.transaction('rw', TABELAS.map((nome) => dbAlvo.table(nome)), async () => {
      for (const nomeTabela of TABELAS) {
        await dbAlvo.table(nomeTabela).clear()
        const linhas = parsed.dados[nomeTabela] ?? []
        if (linhas.length > 0) await dbAlvo.table(nomeTabela).bulkAdd(linhas)
      }
    })

    await logInfo('backup', 'Backup MiauDelier restaurado com sucesso', { checksum: parsed.checksum })

    useAuthStore.getState().sair()
  } catch (err) {
    await logError('backup', `Erro na restauração do backup JSON: ${err instanceof Error ? err.message : String(err)}`, err)
    throw err
  }
}

export async function zerarDadosManterPerfil(): Promise<void> {
  const TABELAS_PARA_ZERAR = [
    'categoriasMaterial',
    'materiais',
    'formas',
    'pecas',
    'consumosPeca',
    'eventosPeca',
    'clientes',
    'pedidos',
    'transacoes',
    'contas',
    'auditoria',
    'backups',
    'mensagensIA',
    'notificacoes',
    'equipamentos',
    'taxas',
    'logs',
  ] as const

  try {
    await deleteUserData()
    
    await db.transaction('rw', TABELAS_PARA_ZERAR.map((nome) => db.table(nome)), async () => {
      for (const nomeTabela of TABELAS_PARA_ZERAR) {
        await db.table(nomeTabela).clear()
      }
    })
    await logInfo('backup', 'Dados do ateliê zerados no local e na nuvem com sucesso')
  } catch (err) {
    await logError('backup', 'Erro ao apagar dados do ateliê', err)
    throw err
  }
}


