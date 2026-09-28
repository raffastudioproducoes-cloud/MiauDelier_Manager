import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../../db/schema'
import {
  calcularTerminoCura,
  calcularRestanteCura,
  calcularProgressoCura,
  iniciarCura,
  adicionarTempoCura,
  verificarCurasConcluidas,
  formatarTempoRestanteCura,
} from './curaRepo'

describe('serviço de cura persistente', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  it('calcula término, restante e progresso de cura corretamente', () => {
    const inicio = 1000000
    const minutos = 60 // 1h
    const peca = {
      id: 1,
      nome: 'Bandeja Resina',
      formaId: 1,
      status: 'curando' as const,
      criadaEm: new Date().toISOString(),
      curaIniciadaEm: inicio,
      curaMinutos: minutos,
    }

    expect(calcularTerminoCura(peca)).toBe(inicio + 60 * 60 * 1000)
    expect(calcularRestanteCura(peca, inicio + 30 * 60 * 1000)).toBe(30 * 60 * 1000)
    expect(calcularProgressoCura(peca, inicio + 30 * 60 * 1000)).toBe(0.5)
    expect(calcularProgressoCura(peca, inicio + 60 * 60 * 1000)).toBe(1.0)
  })

  it('formata o tempo restante em formato legível de dias, horas e minutos', () => {
    expect(formatarTempoRestanteCura(0)).toBe('Cura Concluída!')
    const umDiaEQuatroHoras = (24 + 4) * 3600 * 1000 + 15 * 60 * 1000
    expect(formatarTempoRestanteCura(umDiaEQuatroHoras)).toBe('1d 4h 15m')

    const duasHorasETrintaMin = 2 * 3600 * 1000 + 30 * 60 * 1000
    expect(formatarTempoRestanteCura(duasHorasETrintaMin)).toBe('2h 30m')
  })

  it('inicia cura da peça e grava evento no ledger', async () => {
    const pecaId = await db.pecas.add({
      nome: 'Chaveiro Letra',
      formaId: 2,
      status: 'em_producao',
      criadaEm: new Date().toISOString(),
    })

    await iniciarCura(Number(pecaId), 120, 'cura_desmolde')

    const peca = await db.pecas.get(Number(pecaId))
    expect(peca?.status).toBe('curando')
    expect(peca?.curaMinutos).toBe(120)
    expect(peca?.tipoProcesso).toBe('cura_desmolde')

    const eventos = await db.eventosPeca.where('pecaId').equals(Number(pecaId)).toArray()
    expect(eventos.length).toBe(1)
    expect(eventos[0].tipo).toBe('cura_iniciada')
  })

  it('permite adicionar mais tempo de cura estendendo o cronômetro', async () => {
    const pecaId = await db.pecas.add({
      nome: 'Mesa Resinada',
      formaId: 3,
      status: 'curando',
      criadaEm: new Date().toISOString(),
      curaIniciadaEm: Date.now(),
      curaMinutos: 1440, // 24h (1 dia)
    })

    // Adiciona +24h (1440 min = 1 dia extra)
    await adicionarTempoCura(Number(pecaId), 1440)

    const pecaAtualizada = await db.pecas.get(Number(pecaId))
    expect(pecaAtualizada?.curaMinutos).toBe(2880) // 48h (2 dias total)

    const eventos = await db.eventosPeca.where('pecaId').equals(Number(pecaId)).toArray()
    expect(eventos.some((e) => e.tipo === 'tempo_cura_adicionado')).toBe(true)
  })

  it('verificarCurasConcluidas gera notificação no banco ao atingir tempo', async () => {
    const inicio = Date.now() - 1000 * 60 * 61 // 61 minutos atrás
    const pecaId = await db.pecas.add({
      nome: 'Pirâmide Orgonite',
      formaId: 3,
      status: 'curando',
      criadaEm: new Date().toISOString(),
      curaIniciadaEm: inicio,
      curaMinutos: 60, // 60 minutos total
    })

    const concluidas = await verificarCurasConcluidas()
    expect(concluidas.length).toBe(1)
    expect(concluidas[0].id).toBe(Number(pecaId))

    const notificacoes = await db.notificacoes.toArray()
    expect(notificacoes.length).toBe(1)
    expect(notificacoes[0].titulo).toContain('Cura Concluída!')
  })
})
