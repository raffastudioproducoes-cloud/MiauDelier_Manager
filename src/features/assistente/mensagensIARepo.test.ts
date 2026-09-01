import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../../db/schema'
import { setupAccount } from '../../lib/auth'
import { criarMensagemIA, listarMensagensIA, limparConversaIA } from './mensagensIARepo'

describe('mensagensIARepo', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
    await setupAccount('senha-do-ateliê')
  })

  it('cria e lista mensagens em ordem cronológica', async () => {
    await criarMensagemIA('usuario', 'Qual resina usar pra chaveiro?')
    await criarMensagemIA('assistente', 'Resina cristalina de baixa viscosidade...')
    const mensagens = await listarMensagensIA()
    expect(mensagens).toHaveLength(2)
    expect(mensagens[0].papel).toBe('usuario')
  })

  it('limpa toda a conversa', async () => {
    await criarMensagemIA('usuario', 'Oi')
    await limparConversaIA()
    expect(await listarMensagensIA()).toHaveLength(0)
  })
})
