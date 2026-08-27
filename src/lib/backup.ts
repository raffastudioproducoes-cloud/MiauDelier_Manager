import { db } from '../db/schema'
import { CHAVE_SALT, CHAVE_VERIFICADOR } from './auth'
import { useAuthStore } from '../stores/authStore'

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

type Envelope = { dados: Record<string, unknown[]>; checksum: string }

function ehObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor)
}

function validarEnvelope(json: string): Envelope {
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    throw new Error('arquivo de backup inválido — não é JSON')
  }
  if (!ehObjeto(parsed) || !ehObjeto(parsed.dados) || typeof parsed.checksum !== 'string') {
    throw new Error(
      'arquivo de backup inválido — esperado um objeto com as propriedades "dados" e "checksum"',
    )
  }
  return parsed as unknown as Envelope
}

function validarAutenticacao(dados: Record<string, unknown[]>): void {
  const configuracoes = dados.configuracoes
  const chaves = new Set(
    Array.isArray(configuracoes)
      ? configuracoes.map((linha) => (ehObjeto(linha) ? linha.chave : undefined))
      : [],
  )
  if (!chaves.has(CHAVE_SALT) || !chaves.has(CHAVE_VERIFICADOR)) {
    throw new Error(
      'backup sem as configurações de autenticação (salt e verificador): restaurá-lo apagaria a ' +
        'senha do dispositivo e nenhum dado cifrado poderia ser aberto de novo',
    )
  }
}

export async function exportarBackup(): Promise<string> {
  const dados: Record<string, unknown[]> = {}
  for (const nomeTabela of TABELAS) {
    dados[nomeTabela] = await db.table(nomeTabela).toArray()
  }

  const dadosSerializados = JSON.stringify(dados)
  const checksum = fnv1aHash(dadosSerializados)
  const criadoEm = new Date().toISOString()

  await db.backups.add({ criadoEm, checksum, tamanhoBytes: dadosSerializados.length })

  return JSON.stringify({ dados, checksum, criadoEm })
}

export async function importarBackup(json: string): Promise<void> {
  const parsed = validarEnvelope(json)

  // Toda validação acontece antes de qualquer transação/escrita: um backup corrompido, mal
  // formado ou sem as chaves de autenticação lança aqui e o banco atual permanece intocado.
  const checksumCalculado = fnv1aHash(JSON.stringify(parsed.dados))
  if (checksumCalculado !== parsed.checksum) {
    throw new Error('checksum do backup não confere — arquivo corrompido')
  }
  validarAutenticacao(parsed.dados)

  await db.transaction('rw', TABELAS.map((nome) => db.table(nome)), async () => {
    for (const nomeTabela of TABELAS) {
      await db.table(nomeTabela).clear()
      const linhas = parsed.dados[nomeTabela] ?? []
      if (linhas.length > 0) await db.table(nomeTabela).bulkAdd(linhas)
    }
  })

  // O banco restaurado traz salt e verificador do backup: a chave em memória foi derivada da
  // senha antiga e não abre mais nada. Sair pela store fecha a sessão de cifra E derruba o estado
  // de autenticação da UI juntos — o guard redireciona em vez de montar tela protegida sem chave.
  useAuthStore.getState().sair()
}
