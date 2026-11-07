import { describe, expect, it } from 'vitest'
import { enviarEventosComReenvio, type EventoSincronizado } from './reenvioEventos'

const evento = (id: string): EventoSincronizado => ({ id, perfil_id: 3, tabela: 'materiais', registro_id: id, acao: 'update', dados_criptografados: '{"quantidadeEstoque":5}', timestamp: 42 })

describe('reenvio de eventos', () => {
  it('aceita somente evento idêntico e continua os demais após uma confirmação perdida', async () => {
    const remoto = new Map<string, EventoSincronizado>([['a', evento('a')]])
    await enviarEventosComReenvio([evento('a'), evento('b')], async lote => {
      if (lote.some(item => remoto.has(item.id))) return { code: '23505', message: 'duplicado' }
      lote.forEach(item => remoto.set(item.id, item))
      return null
    }, async id => remoto.get(id) ?? null)
    expect([...remoto.keys()]).toEqual(['a', 'b'])
  })

  it('recusa um UUID já usado com conteúdo diferente', async () => {
    await expect(enviarEventosComReenvio([evento('a')], async () => ({ code: '23505' }), async () => ({ ...evento('a'), dados_criptografados: '{}' }))).rejects.toThrow(/conflito/i)
  })

  it('propaga outras falhas sem consultar nem descartar eventos', async () => {
    let buscas = 0
    await expect(enviarEventosComReenvio([evento('a')], async () => ({ code: '42501', message: 'negado' }), async () => { buscas++; return null })).rejects.toThrow('negado')
    expect(buscas).toBe(0)
  })
})
