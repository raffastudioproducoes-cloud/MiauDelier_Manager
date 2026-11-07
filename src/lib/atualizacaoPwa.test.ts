import { afterEach, describe, expect, it, vi } from 'vitest'
import { acompanharAtualizacaoPwa } from './atualizacaoPwa'

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('verificação de atualização PWA', () => {
  it('verifica ao iniciar e ao retornar ao aplicativo sem consultar repetidamente', async () => {
    vi.useFakeTimers()
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
    const update = vi.fn().mockResolvedValue(undefined)
    const parar = acompanharAtualizacaoPwa({ update })
    expect(update).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(59_000)
    window.dispatchEvent(new Event('focus'))
    expect(update).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1_000)
    window.dispatchEvent(new Event('focus'))
    expect(update).toHaveBeenCalledTimes(2)
    parar()
    await vi.advanceTimersByTimeAsync(60 * 60 * 1000)
    window.dispatchEvent(new Event('focus'))
    expect(update).toHaveBeenCalledTimes(2)
  })

  it('aguarda conexão e visibilidade, e tenta novamente após falha', async () => {
    vi.useFakeTimers()
    const online = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    const visivel = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
    const update = vi.fn().mockRejectedValueOnce(new Error('rede indisponível')).mockResolvedValue(undefined)
    const parar = acompanharAtualizacaoPwa({ update })
    online.mockReturnValue(true)
    window.dispatchEvent(new Event('online'))
    expect(update).not.toHaveBeenCalled()
    visivel.mockReturnValue('visible')
    document.dispatchEvent(new Event('visibilitychange'))
    expect(update).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(60_000)
    window.dispatchEvent(new Event('online'))
    expect(update).toHaveBeenCalledTimes(2)
    parar()
  })
})
