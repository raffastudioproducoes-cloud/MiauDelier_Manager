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

export function formatarTempoRestanteCura(restanteMs: number): string {
  if (restanteMs <= 0) return 'Cura Concluída!'

  const totalSegundos = Math.floor(restanteMs / 1000)
  const dias = Math.floor(totalSegundos / 86400)
  const horas = Math.floor((totalSegundos % 86400) / 3600)
  const minutos = Math.floor((totalSegundos % 3600) / 60)
  const segundos = totalSegundos % 60

  const partes: string[] = []
  if (dias > 0) partes.push(`${dias}d`)
  if (horas > 0 || dias > 0) partes.push(`${horas}h`)
  partes.push(`${minutos}m`)
  if (dias === 0 && horas === 0 && minutos < 5) partes.push(`${segundos}s`)

  return partes.join(' ')
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

export async function adicionarTempoCura(pecaId: number, minutosAdicionais: number): Promise<void> {
  const peca = await db.pecas.get(pecaId)
  if (!peca) throw new Error(`Peça ${pecaId} não encontrada`)

  const minutosAtuais = peca.curaMinutos ?? 0
  const novosMinutos = minutosAtuais + minutosAdicionais
  const agora = Date.now()
  const inicioCura = peca.curaIniciadaEm ?? agora

  await db.pecas.update(pecaId, {
    status: 'curando',
    curaMinutos: novosMinutos,
    curaIniciadaEm: inicioCura,
  })

  await db.eventosPeca.add({
    pecaId,
    tipo: 'tempo_cura_adicionado',
    descricao: `Adicionado mais tempo de cura (${minutosAdicionais} min). Novo tempo total de cura: ${novosMinutos} min.`,
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

    const mensagemChave = `A peça "${peca.nome}" finalizou o tempo de cura e está pronta para inspeção/desmolde!`

    const todasNotifs = await db.notificacoes.toArray()
    const notificacaoExistente = todasNotifs.find((n) => n.mensagem === mensagemChave)

    if (!notificacaoExistente) {
      const titulo = 'Cura Concluída! 🧪'

      await db.notificacoes.add({
        titulo,
        mensagem: mensagemChave,
        lida: false,
        criadoEm: new Date(agora).toISOString(),
      })

      await db.eventosPeca.add({
        pecaId: peca.id,
        tipo: 'cura_concluida',
        descricao: `Tempo de cura da peça ${peca.numeroSerie ?? peca.nome} atingido. Aguardando verificação/desmolde.`,
        criadoEm: new Date(agora).toISOString(),
      })

      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        try {
          new Notification(titulo, { body: mensagemChave })
        } catch {
          // Ignora erro em ambientes sem suporte
        }
      }
    }

    concluidas.push(peca)
  }

  return concluidas
}
