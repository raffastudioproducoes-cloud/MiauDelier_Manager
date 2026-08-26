import 'fake-indexeddb/auto'
import { webcrypto } from 'node:crypto'

if (!globalThis.crypto?.subtle) {
  globalThis.crypto = webcrypto as Crypto
}
