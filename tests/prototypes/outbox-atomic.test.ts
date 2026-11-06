import Dexie, { type EntityTable } from 'dexie'
import { afterEach, describe, expect, it } from 'vitest'

/** Protótipo isolado: não instala hooks no banco do aplicativo. */
interface Registro { id?: number; nome: string }
interface Evento { id: string; registroId: number; dados: string }
class BancoProtótipo extends Dexie {
  registros!: EntityTable<Registro, 'id'>
  outbox!: EntityTable<Evento, 'id'>
  constructor() {
    super(`teste-outbox-${crypto.randomUUID()}`)
    this.version(1).stores({ registros: '++id', outbox: '&id' })
    this.registros.hook('creating', function (_id, obj, tx) {
      this.onsuccess = function (id) {
        // Uma falha ao gravar o evento deve abortar toda a transação.
        void tx.table('outbox').add({ id: crypto.randomUUID(), registroId: id, dados: JSON.stringify({ ...obj, id }) })
          .catch(() => tx.abort())
      }
    })
  }
}
let banco: BancoProtótipo | undefined
afterEach(async () => { if (banco) await banco.delete() })

describe('protótipo de outbox transacional', () => {
  it('confirma dado e evento juntos e preserva ambos após reabrir o banco', async () => {
    banco = new BancoProtótipo()
    const id = await banco.transaction('rw', banco.registros, banco.outbox, () => banco!.registros.add({ nome: 'Peça' }))
    banco.close()
    await banco.open()
    expect(await banco.registros.get(id)).toEqual({ id, nome: 'Peça' })
    const [evento] = await banco.outbox.toArray()
    expect(evento).toMatchObject({ registroId: id, dados: JSON.stringify({ nome: 'Peça', id }) })
    expect(evento.id).toMatch(/^[0-9a-f-]{36}$/i)
  })

  it('descarta dado e evento ao reverter a transação raiz, inclusive se aninhada', async () => {
    banco = new BancoProtótipo()
    await expect(banco.transaction('rw', banco.registros, banco.outbox, async () => {
      await banco!.transaction('rw', banco!.registros, async () => banco!.registros.add({ nome: 'Revertida' }))
      throw new Error('falha após alteração')
    })).rejects.toThrow('falha após alteração')
    expect(await banco.registros.count()).toBe(0)
    expect(await banco.outbox.count()).toBe(0)
  })

  it('não confirma alteração quando a outbox não foi incluída na transação', async () => {
    banco = new BancoProtótipo()
    await expect(banco.transaction('rw', banco.registros, () => banco!.registros.add({ nome: 'Sem fila' }))).rejects.toThrow()
    expect(await banco.registros.count()).toBe(0)
    expect(await banco.outbox.count()).toBe(0)
  })

  it('permite reenvio da mesma operação sem aplicá-la duas vezes no servidor simulado', async () => {
    banco = new BancoProtótipo()
    await banco.transaction('rw', banco.registros, banco.outbox, () => banco!.registros.add({ nome: 'Peça' }))
    const [evento] = await banco.outbox.toArray()
    const servidor = new Map<string, string>()
    let aplicacoes = 0
    const enviar = (item: Evento) => {
      const anterior = servidor.get(item.id)
      if (anterior !== undefined && anterior !== item.dados) throw new Error('Identificador já usado com conteúdo diferente')
      if (anterior === undefined) { servidor.set(item.id, item.dados); aplicacoes++ }
    }
    enviar(evento) // confirmação do servidor é perdida
    enviar(evento) // cliente reenvia o mesmo ID persistido
    expect(aplicacoes).toBe(1)
    expect(() => enviar({ ...evento, dados: 'outro conteúdo' })).toThrow(/conteúdo diferente/)
    await banco.outbox.delete(evento.id) // remoção apenas depois da confirmação
    expect(await banco.outbox.count()).toBe(0)
  })
})
