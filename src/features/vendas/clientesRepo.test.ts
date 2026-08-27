import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../../db/schema'
import { setupAccount } from '../../lib/auth'
import { criarCliente, listarClientes } from './clientesRepo'

describe('repositório de clientes', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
    await setupAccount('senha-do-ateliê')
  })

  it('cria e lista um cliente com o contato decifrado corretamente', async () => {
    await criarCliente({ nome: 'Joana Silva', contato: '(21) 99999-0000' })

    const clientes = await listarClientes()
    expect(clientes).toHaveLength(1)
    expect(clientes[0].nome).toBe('Joana Silva')
    expect(clientes[0].contato).toBe('(21) 99999-0000')
  })

  it('não guarda o contato em claro no registro bruto do banco', async () => {
    await criarCliente({ nome: 'Maria', contato: '21988887777' })

    const bruto = await db.clientes.toArray()
    expect(bruto[0].contato).not.toContain('21988887777')
  })

  it('cria cliente sem contato', async () => {
    await criarCliente({ nome: 'Cliente sem telefone' })
    const clientes = await listarClientes()
    expect(clientes[0].contato).toBeUndefined()
  })
})
