import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../../db/schema'
import { setupAccount } from '../../lib/auth'
import { criarCliente, listarClientes, atualizarCliente, excluirCliente } from './clientesRepo'
import { listarAuditoria } from '../auditoria/auditoriaRepo'

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

  it('atualiza nome e contato de um cliente existente', async () => {
    const id = await criarCliente({ nome: 'Joana', contato: '111' })
    await atualizarCliente(id, { nome: 'Joana Silva', contato: '222' })
    const clientes = await listarClientes()
    expect(clientes[0].nome).toBe('Joana Silva')
    expect(clientes[0].contato).toBe('222')

    const bruto = await db.clientes.toArray()
    expect(bruto[0].contato).not.toContain('222')
  })

  it('exclui um cliente', async () => {
    const id = await criarCliente({ nome: 'Cliente a remover' })
    await excluirCliente(id)
    const clientes = await listarClientes()
    expect(clientes).toHaveLength(0)

    const registros = await listarAuditoria()
    const registro = registros.find((r) => r.entidade === 'cliente' && r.entidadeId === id)
    expect(registro).toBeDefined()
  })
})
