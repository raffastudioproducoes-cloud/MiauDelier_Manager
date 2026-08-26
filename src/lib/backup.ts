import { db } from '../db/schema'

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

export async function exportarBackup(): Promise<string> {
  const dados: Record<string, unknown[]> = {}
  for (const nomeTabela of TABELAS) {
    dados[nomeTabela] = await db.table(nomeTabela).toArray()
  }

  const dadosSerializados = JSON.stringify(dados)
  const checksum = fnv1aHash(dadosSerializados)

  return JSON.stringify({ dados, checksum, criadoEm: new Date().toISOString() })
}

export async function importarBackup(json: string): Promise<void> {
  const parsed = JSON.parse(json) as { dados: Record<string, unknown[]>; checksum: string }
  const dadosSerializados = JSON.stringify(parsed.dados)
  const checksumCalculado = fnv1aHash(dadosSerializados)

  // Validação de checksum acontece antes de qualquer transação/escrita: um backup
  // adulterado ou corrompido lança aqui e o banco atual permanece intocado.
  if (checksumCalculado !== parsed.checksum) {
    throw new Error('checksum do backup não confere — arquivo corrompido ou adulterado')
  }

  await db.transaction('rw', TABELAS.map((nome) => db.table(nome)), async () => {
    for (const nomeTabela of TABELAS) {
      await db.table(nomeTabela).clear()
      const linhas = parsed.dados[nomeTabela] ?? []
      if (linhas.length > 0) await db.table(nomeTabela).bulkAdd(linhas)
    }
  })
}
