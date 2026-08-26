import { describe, it, expect } from 'vitest'
import { deriveKey, generateSalt, encryptText, decryptText } from './crypto'

describe('crypto local', () => {
  it('cripto e descripto um texto com a mesma senha', async () => {
    const salt = generateSalt()
    const key = await deriveKey('senha-forte-123', salt)
    const encoded = await encryptText(key, 'dado sensível: R$ 1.234,56')
    expect(encoded).not.toContain('dado sensível')

    const decoded = await decryptText(key, encoded)
    expect(decoded).toBe('dado sensível: R$ 1.234,56')
  })

  it('falha ao descripto com senha errada', async () => {
    const salt = generateSalt()
    const key = await deriveKey('senha-certa', salt)
    const encoded = await encryptText(key, 'segredo')

    const outraKey = await deriveKey('senha-errada', salt)
    await expect(decryptText(outraKey, encoded)).rejects.toThrow()
  })

  it('gera salts diferentes a cada chamada', () => {
    const a = generateSalt()
    const b = generateSalt()
    expect(a).not.toEqual(b)
  })
})
