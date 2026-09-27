export interface InfoUnidade {
  grupo: 'volume' | 'massa' | 'comprimento' | 'contagem' | 'outra'
  fatorParaBase: number
  unidadeBase: string
}

const MAPA_UNIDADES: Record<string, InfoUnidade> = {
  ml: { grupo: 'volume', fatorParaBase: 1, unidadeBase: 'ml' },
  l: { grupo: 'volume', fatorParaBase: 1000, unidadeBase: 'ml' },
  litro: { grupo: 'volume', fatorParaBase: 1000, unidadeBase: 'ml' },
  litros: { grupo: 'volume', fatorParaBase: 1000, unidadeBase: 'ml' },

  g: { grupo: 'massa', fatorParaBase: 1, unidadeBase: 'g' },
  grama: { grupo: 'massa', fatorParaBase: 1, unidadeBase: 'g' },
  gramas: { grupo: 'massa', fatorParaBase: 1, unidadeBase: 'g' },
  kg: { grupo: 'massa', fatorParaBase: 1000, unidadeBase: 'g' },
  kilo: { grupo: 'massa', fatorParaBase: 1000, unidadeBase: 'g' },
  quilograma: { grupo: 'massa', fatorParaBase: 1000, unidadeBase: 'g' },
  quilogramas: { grupo: 'massa', fatorParaBase: 1000, unidadeBase: 'g' },

  cm: { grupo: 'comprimento', fatorParaBase: 1, unidadeBase: 'cm' },
  m: { grupo: 'comprimento', fatorParaBase: 100, unidadeBase: 'cm' },
  metro: { grupo: 'comprimento', fatorParaBase: 100, unidadeBase: 'cm' },
  metros: { grupo: 'comprimento', fatorParaBase: 100, unidadeBase: 'cm' },

  un: { grupo: 'contagem', fatorParaBase: 1, unidadeBase: 'un' },
  par: { grupo: 'contagem', fatorParaBase: 1, unidadeBase: 'par' },
  pct: { grupo: 'contagem', fatorParaBase: 1, unidadeBase: 'pct' },
  cx: { grupo: 'contagem', fatorParaBase: 1, unidadeBase: 'cx' },
  kit: { grupo: 'contagem', fatorParaBase: 1, unidadeBase: 'kit' },
  folha: { grupo: 'contagem', fatorParaBase: 1, unidadeBase: 'folha' },
  rolo: { grupo: 'contagem', fatorParaBase: 1, unidadeBase: 'rolo' },
}

export function ehIncompativel(unidadeOrigem: string, unidadeDestino: string): boolean {
  const u1 = unidadeOrigem.trim().toLowerCase()
  const u2 = unidadeDestino.trim().toLowerCase()
  if (u1 === u2) return false
  const info1 = MAPA_UNIDADES[u1]
  const info2 = MAPA_UNIDADES[u2]
  if (!info1 || !info2) return false
  return info1.grupo !== info2.grupo
}

export function converterQuantidade(
  quantidade: number,
  unidadeOrigem: string,
  unidadeDestino: string,
): { quantidadeConvertida: number; fator: number } {
  const u1 = unidadeOrigem.trim().toLowerCase()
  const u2 = unidadeDestino.trim().toLowerCase()

  if (!Number.isFinite(quantidade)) {
    return { quantidadeConvertida: 0, fator: 1 }
  }

  if (u1 === u2) {
    return { quantidadeConvertida: quantidade, fator: 1 }
  }

  const info1 = MAPA_UNIDADES[u1]
  const info2 = MAPA_UNIDADES[u2]

  if (info1 && info2 && info1.grupo === info2.grupo) {
    const valorEmBase = quantidade * info1.fatorParaBase
    const quantidadeConvertida = valorEmBase / info2.fatorParaBase
    return { quantidadeConvertida, fator: info1.fatorParaBase / info2.fatorParaBase }
  }

  return { quantidadeConvertida: quantidade, fator: 1 }
}

export function obterOpcoesUnidadeCompativeis(unidadeBase: string): string[] {
  const u = unidadeBase.trim().toLowerCase()
  const info = MAPA_UNIDADES[u]
  if (!info) return [unidadeBase]

  if (info.grupo === 'volume') return ['ml', 'l']
  if (info.grupo === 'massa') return ['g', 'kg']
  if (info.grupo === 'comprimento') return ['cm', 'm']
  return [unidadeBase]
}
