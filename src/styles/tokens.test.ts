import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

describe('tokens de design', () => {
  it('define todas as camadas de elevação exigidas pelo design de referência', () => {
    const css = readFileSync(resolve(__dirname, './globals.css'), 'utf-8')
    expect(css).toContain('.elevation-base')
    expect(css).toContain('.elevation-raised')
    expect(css).toContain('.elevation-inset')
    expect(css).toContain('.elevation-pressed')
  })

  it('define a escala de radius exigida', () => {
    const css = readFileSync(resolve(__dirname, './globals.css'), 'utf-8')
    expect(css).toContain('--radius-sm')
    expect(css).toContain('--radius-md')
    expect(css).toContain('--radius-lg')
    expect(css).toContain('--radius-xl')
    expect(css).toContain('--radius-2xl')
  })
})
