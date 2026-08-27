import { db, type Forma } from '../../db/schema'

export type NovaForma = Omit<Forma, 'id'>

export async function criarForma(nova: NovaForma): Promise<number> {
  const id = await db.formas.add(nova)
  return id as number
}

export async function listarFormas(): Promise<Forma[]> {
  return db.formas.toArray()
}
