import { db, type Peca } from '../../db/schema'

export function calcularTerminoCura(peca: Peca): number | null {
  if (!peca.curaIniciadaEm || !peca.curaMinutos) return null
  return peca.curaIniciadaEm + peca.curaMinutos * 60_000
}

export function calcularRestanteCura(peca: Peca, agora = Date.now()): number {
  const termino = calcularTerminoCura(peca)
  if (!termino) return 0
  return Math.max(0, termino - agora)
}

export function calcularProgressoCura(peca: Peca, agora = Date.now()): number {
  if (!peca.curaIniciadaEm || !peca.curaMinutos) return 0
  const duracao = peca.curaMinutos * 60_000
  return Math.min(1, Math.max(0, (agora - peca.curaIniciadaEm) / duracao))
}

export async function iniciarCura(pecaId: number, minutos: number, tipoProcesso = 'cura'): Promise<void> {
  const agora = Date.now()
  await db.pecas.update(pecaId, {
    status: 'curando',
    curaIniciadaEm: agora,
    curaMinutos: minutos,
    tipoProcesso,
  })
  await db.eventosPeca.add({
    pecaId,
    tipo: 'cura_iniciada',
    descricao: `Processo de ${tipoProcesso} iniciado (${minutos} min).`,
    criadoEm: new Date(agora).toISOString(),
  })
}

export async function verificarCurasConcluidas(agora = Date.now()): Promise<Peca[]> {
  const pecasEmCura = await db.pecas.where('status').equals('curando').toArray()
  const concluidas: Peca[] = []

  for (const peca of pecasEmCura) {
    if (!peca.id) continue
    const termino = calcularTerminoCura(peca)
    if (!termino || agora < termino) continue

    await db.pecas.update(peca.id, { status: 'pronta' })
    await db.eventosPeca.add({
      pecaId: peca.id,
      tipo: 'cura_concluida',
      descricao: `Cura da peça ${peca.numeroSerie ?? peca.nome} concluída.`,
      criadoEm: new Date(agora).toISOString(),
    })

    const titulo = 'Cura Concluída! 🧪'
    const mensagem = `A peça "${peca.nome}" finalizou o tempo de cura e está pronta!`

    await db.notificacoes.add({
      titulo,
      mensagem,
      lida: false,
      criadoEm: new Date(agora).toISOString(),
    })

    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      try {
        new Notification(titulo, { body: mensagem })
      } catch {
        // Ignora erro em ambientes sem suporte
      }
    }

    concluidas.push({ ...peca, status: 'pronta' })
  }

  return concluidas
}
