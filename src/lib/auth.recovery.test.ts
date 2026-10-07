import { describe, expect, it, vi } from 'vitest'

const upsertMock = vi.fn()

vi.mock('./supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(async () => ({
        data: { session: { user: { id: 'user-1', email: 'test@example.com' } } },
      })),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(async () => ({ data: null, error: { message: 'not found' } })),
        })),
      })),
      upsert: upsertMock,
    })),
  },
}))

describe('recuperarCofreComNuvem', () => {
  it('nao cria nem sobrescreve uma DEK quando a chave remota esta ausente', async () => {
    const { recuperarCofreComNuvem } = await import('./auth')

    await expect(recuperarCofreComNuvem('senha-teste')).rejects.toThrow(
      /Nenhuma chave nova foi criada/i,
    )
    expect(upsertMock).not.toHaveBeenCalled()
  })
})
