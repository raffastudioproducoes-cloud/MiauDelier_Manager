/**
 * Procura um novo service worker também ao retornar ao app ou recuperar rede.
 * A ativação/recarregamento continua sob controle do registro PWA existente.
 * Isto não bloqueia clientes antigos que ainda não executam esta versão.
 */
export function acompanharAtualizacaoPwa(registro: Pick<ServiceWorkerRegistration, 'update'>): () => void {
  const intervaloMinimoMs = 60_000
  let ultimaTentativa = -Infinity
  let emAndamento = false

  function verificar() {
    if (!navigator.onLine || document.visibilityState !== 'visible' || emAndamento) return
    const agora = Date.now()
    if (agora - ultimaTentativa < intervaloMinimoMs) return
    ultimaTentativa = agora
    emAndamento = true
    void registro.update().catch(() => {
      // Falha temporária de rede é tentada novamente no próximo evento/intervalo.
    }).finally(() => { emAndamento = false })
  }

  const intervalo = window.setInterval(verificar, 60 * 60 * 1000)
  window.addEventListener('online', verificar)
  window.addEventListener('focus', verificar)
  document.addEventListener('visibilitychange', verificar)
  verificar()

  return () => {
    window.clearInterval(intervalo)
    window.removeEventListener('online', verificar)
    window.removeEventListener('focus', verificar)
    document.removeEventListener('visibilitychange', verificar)
  }
}
