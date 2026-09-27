export type Geometria = 'retangular' | 'cilindrico' | 'esferico' | 'direto'
export type Proporcao = '2:1' | '3:1' | '1:1' | '100:3'

export interface VolumeInput {
  geometria: Geometria
  comprimento?: number
  largura?: number
  profundidade?: number
  raio?: number
  altura?: number
  volumeMl?: number
}

export interface VolumeOpcoes {
  margemSeguranca?: boolean
}

const FATOR_MARGEM_SEGURANCA = 1.1

function validarDimensao(nome: string, valor: number): void {
  if (!Number.isFinite(valor) || valor < 0) {
    throw new Error(`dimensão inválida: "${nome}" deve ser um número finito e não-negativo (recebido: ${valor})`)
  }
}

export function calcularVolumeMl(input: VolumeInput, opcoes: VolumeOpcoes = {}): number {
  let volume: number

  switch (input.geometria) {
    case 'retangular':
      validarDimensao('comprimento', input.comprimento ?? 0)
      validarDimensao('largura', input.largura ?? 0)
      validarDimensao('profundidade', input.profundidade ?? 0)
      volume = (input.comprimento ?? 0) * (input.largura ?? 0) * (input.profundidade ?? 0)
      break
    case 'cilindrico':
      validarDimensao('raio', input.raio ?? 0)
      validarDimensao('altura', input.altura ?? 0)
      volume = Math.PI * Math.pow(input.raio ?? 0, 2) * (input.altura ?? 0)
      break
    case 'esferico':
      validarDimensao('raio', input.raio ?? 0)
      volume = (4 / 3) * Math.PI * Math.pow(input.raio ?? 0, 3)
      break
    case 'direto':
      validarDimensao('volumeMl', input.volumeMl ?? 0)
      volume = input.volumeMl ?? 0
      break
  }

  return opcoes.margemSeguranca ? volume * FATOR_MARGEM_SEGURANCA : volume
}

const PROPORCOES: Record<Proporcao, { fracaoA: number; fracaoB: number }> = {
  '2:1': { fracaoA: 2 / 3, fracaoB: 1 / 3 },
  '3:1': { fracaoA: 3 / 4, fracaoB: 1 / 4 },
  '1:1': { fracaoA: 0.5, fracaoB: 0.5 },
  '100:3': { fracaoA: 1, fracaoB: 0.03 },
}

export function calcularProporcaoMistura(
  volumeMl: number,
  proporcao: Proporcao,
): { parteA: number; parteB: number } {
  if (!Number.isFinite(volumeMl) || volumeMl < 0) {
    throw new Error(`volumeMl inválido: deve ser um número finito e não-negativo (recebido: ${volumeMl})`)
  }
  const { fracaoA, fracaoB } = PROPORCOES[proporcao]
  return { parteA: volumeMl * fracaoA, parteB: volumeMl * fracaoB }
}

export function calcularVolumeTotalForma(forma: {
  geometria?: Geometria
  dimensoesCm?: { comprimento?: number; largura?: number; profundidade?: number; raio?: number; altura?: number }
  volumeDiretoMl?: number
  cavidades?: Array<{
    comprimentoCm?: number
    larguraCm?: number
    profundidadeCm?: number
    volumeManualMl?: number
  }>
}): number {
  if (forma.cavidades && forma.cavidades.length > 0) {
    return forma.cavidades.reduce((total, cav) => {
      if (typeof cav.volumeManualMl === 'number' && cav.volumeManualMl > 0) {
        return total + cav.volumeManualMl
      }
      const c = cav.comprimentoCm ?? 0
      const l = cav.larguraCm ?? 0
      const p = cav.profundidadeCm ?? 0
      return total + c * l * p
    }, 0)
  }

  return calcularVolumeMl({
    geometria: forma.geometria ?? 'direto',
    comprimento: forma.dimensoesCm?.comprimento,
    largura: forma.dimensoesCm?.largura,
    profundidade: forma.dimensoesCm?.profundidade,
    raio: forma.dimensoesCm?.raio,
    altura: forma.dimensoesCm?.altura,
    volumeMl: forma.volumeDiretoMl,
  })
}

