import Dexie from 'dexie'
import { db } from '../db/schema'

/** Inclui a fila no escopo raiz para que dado e evento confirmem juntos. */
export function transacaoSincronizada<T>(operacao: () => Promise<T>): Promise<T> {
  if (Dexie.currentTransaction) return operacao()
  return db.transaction('rw', db.tables, operacao)
}
