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

export interface VolumeSiliconeMoldeInput {
  caixaInternaCm: { comprimento: number; largura: number; altura: number }
  tampoMesaCm: { comprimento: number; largura: number; espessura: number }
  furosVazados?: FuroVazadoInput[]
  densidadeSiliconeGcm3: number
}

export interface ResultadoVolumeSiliconeMolde {
  volumeCaixaCm3: number
  volumeTampoMadeiraCm3: number
  volumeInsertosMadeiraCm3: number
  volumeMadeiraTotalCm3: number
  volumeLiquidoCm3: number
  volumeMinimoLitros: number
  volumeMaximoLitros: number
  massaMinimaKg: number
  massaMaximaKg: number
}

export function parseNumeroPtBr(texto: string): number | null {
  const valor = texto.trim().replace(/\s/g, '')
  if (!valor || !/^[+-]?[\d.,]+$/.test(valor)) return null

  const temVirgula = valor.includes(',')
  const temPonto = valor.includes('.')
  let normalizado = valor

  if (temVirgula && temPonto) {
    if (!/^[+-]?\d{1,3}(?:\.\d{3})+,\d+$/.test(valor)) return null
    normalizado = valor.replace(/\./g, '').replace(',', '.')
  } else if (temVirgula) {
    if ((valor.match(/,/g) ?? []).length > 1) return null
    normalizado = valor.replace(',', '.')
  } else if ((valor.match(/\./g) ?? []).length > 1) {
    return null
  }

  const numero = Number(normalizado)
  return Number.isFinite(numero) ? numero : null
}

function validarMedidaPositivaSilicone(nome: string, valor: number): void {
  if (!Number.isFinite(valor) || valor <= 0) {
    throw new Error(`${nome} deve ser um número finito maior que zero.`)
  }
}

export function calcularVolumeSiliconeMolde(input: VolumeSiliconeMoldeInput): ResultadoVolumeSiliconeMolde {
  const { caixaInternaCm: caixa, tampoMesaCm: tampo } = input
  validarMedidaPositivaSilicone('Comprimento interno da caixa', caixa.comprimento)
  validarMedidaPositivaSilicone('Largura interna da caixa', caixa.largura)
  validarMedidaPositivaSilicone('Altura interna da caixa', caixa.altura)
  validarMedidaPositivaSilicone('Comprimento do tampo', tampo.comprimento)
  validarMedidaPositivaSilicone('Largura do tampo', tampo.largura)
  validarMedidaPositivaSilicone('Espessura do tampo', tampo.espessura)
  validarMedidaPositivaSilicone('Densidade do silicone', input.densidadeSiliconeGcm3)

  if (caixa.comprimento < tampo.comprimento || caixa.largura < tampo.largura || caixa.altura < tampo.espessura) {
    throw new Error('As dimensões internas da caixa devem acomodar o tampo da mesa.')
  }

  const volumeCaixaCm3 = caixa.comprimento * caixa.largura * caixa.altura
  const volumeTampoMadeiraCm3 = tampo.comprimento * tampo.largura * tampo.espessura
  let volumeInsertosMadeiraCm3 = 0

  for (const furo of input.furosVazados ?? []) {
    if (!Number.isSafeInteger(furo.quantidade) || furo.quantidade < 0) {
      throw new Error('A quantidade de insertos de madeira deve ser um inteiro não negativo.')
    }
    if (furo.quantidade === 0) continue

    const profundidadeCm = furo.profundidadeCm ?? tampo.espessura
    validarMedidaPositivaSilicone('Profundidade do inserto', profundidadeCm)
    if (profundidadeCm > tampo.espessura) {
      throw new Error('A profundidade dos insertos não pode exceder a espessura do tampo.')
    }

    if (furo.geometria === 'retangulo') {
      const comprimentoCm = furo.comprimentoCm ?? 0
      const larguraCm = furo.larguraCm ?? 0
      validarMedidaPositivaSilicone('Comprimento do inserto retangular', comprimentoCm)
      validarMedidaPositivaSilicone('Largura do inserto retangular', larguraCm)
      volumeInsertosMadeiraCm3 += furo.quantidade * comprimentoCm * larguraCm * profundidadeCm
    } else {
      const diametroCm = furo.diametroCm ?? 0
      validarMedidaPositivaSilicone('Diâmetro do inserto cilíndrico', diametroCm)
      const raioCm = diametroCm / 2
      volumeInsertosMadeiraCm3 += furo.quantidade * Math.PI * raioCm ** 2 * profundidadeCm
    }
  }

  if (volumeInsertosMadeiraCm3 > volumeTampoMadeiraCm3) {
    throw new Error('O volume dos furos não pode exceder o volume do tampo.')
  }
  // Os insertos preenchem os furos com as mesmas dimensões informadas.
  const volumeMadeiraTotalCm3 = volumeTampoMadeiraCm3 - volumeInsertosMadeiraCm3 + volumeInsertosMadeiraCm3
  const volumeLiquidoCm3 = volumeCaixaCm3 - volumeMadeiraTotalCm3
  const volumeMinimoLitros = volumeLiquidoCm3 * 1.08 / 1000
  const volumeMaximoLitros = volumeLiquidoCm3 * 1.12 / 1000
  const massaMinimaKg = volumeMinimoLitros * input.densidadeSiliconeGcm3
  const massaMaximaKg = volumeMaximoLitros * input.densidadeSiliconeGcm3

  if (
    ![volumeCaixaCm3, volumeTampoMadeiraCm3, volumeInsertosMadeiraCm3, volumeMadeiraTotalCm3,
      volumeLiquidoCm3, volumeMinimoLitros, volumeMaximoLitros, massaMinimaKg, massaMaximaKg].every(Number.isFinite)
  ) {
    throw new Error('As dimensões informadas excedem o limite numérico suportado.')
  }
  if (volumeMadeiraTotalCm3 >= volumeCaixaCm3) {
    throw new Error('O volume total de madeira deve ser menor que o volume interno da caixa.')
  }

  return {
    volumeCaixaCm3,
    volumeTampoMadeiraCm3,
    volumeInsertosMadeiraCm3,
    volumeMadeiraTotalCm3,
    volumeLiquidoCm3,
    volumeMinimoLitros,
    volumeMaximoLitros,
    massaMinimaKg,
    massaMaximaKg,
  }
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

