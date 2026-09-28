import 'fake-indexeddb/auto'
import '@testing-library/jest-dom/vitest'
import { webcrypto } from 'node:crypto'
import { configure } from '@testing-library/react'

if (!globalThis.crypto?.subtle) {
  globalThis.crypto = webcrypto as Crypto
}

configure({ asyncUtilTimeout: 5000 })
