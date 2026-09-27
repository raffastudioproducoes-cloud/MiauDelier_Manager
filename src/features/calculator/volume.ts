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

export interface FuroVazadoInput {
  quantidade: number
  geometria?: 'circulo' | 'retangulo'
  diametroCm?: number
  comprimentoCm?: number
  larguraCm?: number
  profundidadeCm?: number
}

export interface PeMesaInput {
  quantidade: number
  geometria: 'cilindrico' | 'retangular'
  raioCm?: number
  alturaCm?: number
  comprimentoCm?: number
  larguraCm?: number
}

export interface VolumeMesaResinaInput {
  comprimentoCm: number
  larguraCm: number
  espessuraCm: number
  furosVazados?: FuroVazadoInput[]
  pesMesa?: PeMesaInput
  densidadeResinaKgL?: number
  margemSegurancaPercentual?: number
}

export interface ResultadoVolumeMesaResina {
  volumeBrutoTampoMl: number
  volumeVazadosMl: number
  volumePesMl: number
  volumeLiquidoResinaMl: number
  volumeComMargemMl: number
  litrosResina: number
  massaResinaKg: number
}

export function calcularVolumeMesaResina(input: VolumeMesaResinaInput): ResultadoVolumeMesaResina {
  const c = Math.max(0, input.comprimentoCm || 0)
  const l = Math.max(0, input.larguraCm || 0)
  const e = Math.max(0, input.espessuraCm || 0)

  const volumeBrutoTampoMl = c * l * e

  let volumeVazadosMl = 0
  if (input.furosVazados && input.furosVazados.length > 0) {
    for (const furo of input.furosVazados) {
      const qtd = Math.max(0, furo.quantidade || 0)
      if (qtd === 0) continue
      const prof = furo.profundidadeCm && furo.profundidadeCm > 0 ? furo.profundidadeCm : e
      if (furo.geometria === 'retangulo') {
        const fc = Math.max(0, furo.comprimentoCm || 0)
        const fl = Math.max(0, furo.larguraCm || 0)
        volumeVazadosMl += qtd * (fc * fl * prof)
      } else {
        // Círculo (padrão tigelas comedouro pets)
        const d = Math.max(0, furo.diametroCm || 0)
        const r = d / 2
        volumeVazadosMl += qtd * (Math.PI * Math.pow(r, 2) * prof)
      }
    }
  }

  let volumePesMl = 0
  if (input.pesMesa && input.pesMesa.quantidade > 0) {
    const p = input.pesMesa
    const qtd = Math.max(0, p.quantidade)
    if (p.geometria === 'retangular') {
      const pc = Math.max(0, p.comprimentoCm || 0)
      const pl = Math.max(0, p.larguraCm || 0)
      const pa = Math.max(0, p.alturaCm || 0)
      volumePesMl = qtd * (pc * pl * pa)
    } else {
      // Cilíndrico
      const pr = Math.max(0, p.raioCm || 0)
      const pa = Math.max(0, p.alturaCm || 0)
      volumePesMl = qtd * (Math.PI * Math.pow(pr, 2) * pa)
    }
  }

  const volumeLiquidoResinaMl = Math.max(0, volumeBrutoTampoMl - volumeVazadosMl + volumePesMl)
  const margem = Math.max(0, input.margemSegurancaPercentual ?? 10) / 100
  const volumeComMargemMl = volumeLiquidoResinaMl * (1 + margem)

  const densidade = input.densidadeResinaKgL ?? 1.1
  const litrosResina = volumeComMargemMl / 1000
  const massaResinaKg = litrosResina * densidade

  return {
    volumeBrutoTampoMl,
    volumeVazadosMl,
    volumePesMl,
    volumeLiquidoResinaMl,
    volumeComMargemMl,
    litrosResina,
    massaResinaKg,
  }
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
  furosVazados?: FuroVazadoInput[]
  pesMesa?: PeMesaInput
  margemSegurancaPercentual?: number
}): number {
  if (
    forma.geometria === 'retangular' &&
    forma.dimensoesCm &&
    forma.dimensoesCm.comprimento &&
    forma.dimensoesCm.largura &&
    forma.dimensoesCm.profundidade &&
    ((forma.furosVazados && forma.furosVazados.length > 0) || (forma.pesMesa && forma.pesMesa.quantidade > 0))
  ) {
    const res = calcularVolumeMesaResina({
      comprimentoCm: forma.dimensoesCm.comprimento,
      larguraCm: forma.dimensoesCm.largura,
      espessuraCm: forma.dimensoesCm.profundidade,
      furosVazados: forma.furosVazados,
      pesMesa: forma.pesMesa,
      margemSegurancaPercentual: forma.margemSegurancaPercentual ?? 10,
    })
    return res.volumeComMargemMl
  }

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

