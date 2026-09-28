import { useState, useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Button } from './Button'

const CHAVE_CONSENTIMENTO = 'miaudelier_lgpd_consentimento'

export function BannerConsentimentoLGPD() {
  const navigate = useNavigate()
  const [visivel, setVisivel] = useState(false)

  useEffect(() => {
    try {
      const consentimento = localStorage.getItem(CHAVE_CONSENTIMENTO)
      if (!consentimento) {
        setVisivel(true)
      }
    } catch {
      setVisivel(true)
    }
  }, [])

  function aceitar() {
    try {
      localStorage.setItem(CHAVE_CONSENTIMENTO, 'aceito_' + new Date().toISOString())
    } catch {
      // erro de escrita ignorado
    }
    setVisivel(false)
  }

  function irParaPrivacidade() {
    aceitar()
    navigate({ to: '/privacidade' })
  }

  if (!visivel) return null

  return (
    <div className="fixed bottom-3 left-3 right-3 z-50 max-w-4xl mx-auto p-4 rounded-2xl bg-surface-container-highest/95 backdrop-blur-xl border border-outline-variant/30 shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-on-surface">
      <div className="flex items-start gap-3">
        <span className="text-2xl shrink-0">🛡️</span>
        <div className="flex flex-col gap-1">
          <p className="font-bold text-sm text-primary">Privacidade e Armazenamento Local (LGPD)</p>
          <p className="text-on-surface-variant leading-relaxed">
            O MiauDelier Manager opera em modelo <strong>Local-First</strong>. Seus dados (clientes, peças e finanças) ficam armazenados e criptografados (AES-256) exclusivamente no seu dispositivo, sem envio para servidores de terceiros, atendendo à Lei Geral de Proteção de Dados (Lei nº 13.709/2018).
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
        <Button type="button" variante="ghost" className="text-xs" onClick={irParaPrivacidade}>
          Política de Privacidade
        </Button>
        <Button type="button" variante="primary" className="text-xs" onClick={aceitar}>
          Entendi e Aceito
        </Button>
      </div>
    </div>
  )
}
