const PBKDF2_ITERATIONS = 600_000
const SALT_LENGTH_BYTES = 16
const IV_LENGTH_BYTES = 12

export function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(SALT_LENGTH_BYTES))
}

export async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder()
  const baseKey = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, [
    'deriveKey',
  ])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey'],
  )
}

export async function importSessionKey(base64Key: string): Promise<CryptoKey> {
  const rawBytes = base64ToBytes(base64Key)
  return crypto.subtle.importKey(
    'raw',
    rawBytes,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt'],
  )
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

export function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64)
  return Uint8Array.from(binary, (char) => char.charCodeAt(0))
}

export async function encryptText(key: CryptoKey, plaintext: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH_BYTES))
  const encoded = new TextEncoder().encode(plaintext)
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded)
  return `${bytesToBase64(iv)}:${bytesToBase64(new Uint8Array(ciphertext))}`
}

export async function decryptText(key: CryptoKey, encoded: string): Promise<string> {
  const [ivPart, ciphertextPart] = encoded.split(':')
  if (!ivPart || !ciphertextPart) throw new Error('formato de texto cifrado inválido')
  const iv = base64ToBytes(ivPart)
  const ciphertext = base64ToBytes(ciphertextPart)
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext)
  return new TextDecoder().decode(plaintext)
}

export async function generateDEK(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey']
  )
}

export async function wrapDEK(dek: CryptoKey, kek: CryptoKey): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH_BYTES))
  const wrapped = await crypto.subtle.wrapKey('raw', dek, kek, { name: 'AES-GCM', iv })
  return `${bytesToBase64(iv)}:${bytesToBase64(new Uint8Array(wrapped))}`
}

export async function unwrapDEK(wrappedDek: string, kek: CryptoKey): Promise<CryptoKey> {
  const [ivPart, ciphertextPart] = wrappedDek.split(':')
  if (!ivPart || !ciphertextPart) throw new Error('formato de chave cifrada inválido')
  const iv = base64ToBytes(ivPart)
  const ciphertext = base64ToBytes(ciphertextPart)
  return crypto.subtle.unwrapKey(
    'raw',
    ciphertext,
    kek,
    { name: 'AES-GCM', iv },
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  )
}

export async function deriveRecoveryKEK(userId: string, email: string): Promise<CryptoKey> {
  const pepper = 'miaudelier-secure-recovery-pepper-v1'
  const encoder = new TextEncoder()
  const baseKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(userId + pepper),
    'PBKDF2',
    false,
    ['deriveKey']
  )
  const salt = encoder.encode(email.toLowerCase().trim())
  
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey']
  )
}
