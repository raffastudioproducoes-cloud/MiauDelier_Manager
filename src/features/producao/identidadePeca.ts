/**
 * Usa uma região alta do espaço inteiro seguro, afastada dos IDs sequenciais
 * legados. A aleatoriedade reduz colisões entre dispositivos, mas não é uma
 * restrição global de unicidade: o sincronizador deve detectar conflitos.
 */
export function gerarIdNumericoPeca(): number {
  const partes = crypto.getRandomValues(new Uint32Array(2))
  return 2 ** 52 + (partes[0] & 0x7ffff) * 2 ** 32 + partes[1]
}

export async function obterIdNumericoPecaDisponivel(existe: (id: number) => Promise<unknown>): Promise<number> {
  for (let tentativa = 0; tentativa < 8; tentativa++) {
    const id = gerarIdNumericoPeca()
    if (!await existe(id)) return id
  }
  throw new Error('Não foi possível gerar um identificador disponível para a peça.')
}
