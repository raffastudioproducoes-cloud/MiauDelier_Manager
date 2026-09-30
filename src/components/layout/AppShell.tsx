import { useState, useEffect, type ReactNode } from 'react'
import { useNavigate, useRouterState } from '@tanstack/react-router'
import { useAuthStore } from '../../stores/authStore'
import { getPerfilAtivo } from '../../lib/perfisRepo'
import { cn } from '../../lib/cn'
import { NavItem } from './NavItem'
import { Button } from '../ui/Button'
import logoMiauDelier from '../../assets/logo-miaudelier.png'

import { exportarBackup } from '../../lib/backup'
import { BannerConsentimentoLGPD } from '../ui/BannerConsentimentoLGPD'

interface ItemMenu {
  rotulo: string
  rota: string
  icone: ReactNode
}

interface SecaoMenu {
  titulo: string
  itens: ItemMenu[]
}

const SECOES_MENU: SecaoMenu[] = [
  {
    titulo: 'Geral',
    itens: [
      {
        rotulo: 'Perfil do Ateliê',
        rota: '/perfil',
        icone: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        ),
      },
      {
        rotulo: 'Início',
        rota: '/',
        icone: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1.5" />
            <rect x="14" y="3" width="7" height="7" rx="1.5" />
            <rect x="14" y="14" width="7" height="7" rx="1.5" />
            <rect x="3" y="14" width="7" height="7" rx="1.5" />
          </svg>
        ),
      },
      {
        rotulo: 'Analytics',
        rota: '/analytics',
        icone: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 20V10M12 20V4M6 20v-6" />
          </svg>
        ),
      },
      {
        rotulo: 'Diagnóstico',
        rota: '/diagnostico',
        icone: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
        ),
      },
      {
        rotulo: 'Assistente',
        rota: '/assistente',
        icone: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        ),
      },
      {
        rotulo: 'Ajuda & FAQ',
        rota: '/ajuda',
        icone: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        ),
      },
    ],
  },

  {
    titulo: 'Produção',
    itens: [
      {
        rotulo: 'Materiais',
        rota: '/materiais',
        icone: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
            <line x1="12" y1="22.08" x2="12" y2="12" />
          </svg>
        ),
      },
      {
        rotulo: 'Categorias',
        rota: '/categorias',
        icone: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
            <line x1="7" y1="7" x2="7.01" y2="7" />
          </svg>
        ),
      },
      {
        rotulo: 'Formas',
        rota: '/formas',
        icone: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="4" />
            <path d="M12 8v8M8 12h8" />
          </svg>
        ),
      },
      {
        rotulo: 'Peças',
        rota: '/pecas',
        icone: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
        ),
      },
      {
        rotulo: 'Equipamentos',
        rota: '/equipamentos',
        icone: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
          </svg>
        ),
      },
    ],
  },
  {
    titulo: 'Vendas',
    itens: [
      {
        rotulo: 'Precificação',
        rota: '/precificacao',
        icone: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="4" y="2" width="16" height="20" rx="2" />
            <line x1="8" y1="6" x2="16" y2="6" />
            <line x1="16" y1="14" x2="16" y2="18" />
            <path d="M16 10h.01M12 10h.01M8 10h.01M12 14h.01M8 14h.01M12 18h.01M8 18h.01" />
          </svg>
        ),
      },
      {
        rotulo: 'Taxas de Vendedor',
        rota: '/taxas',
        icone: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="5" x2="5" y2="19" />
            <circle cx="6.5" cy="6.5" r="2.5" />
            <circle cx="17.5" cy="17.5" r="2.5" />
          </svg>
        ),
      },
      {
        rotulo: 'Clientes',
        rota: '/clientes',
        icone: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        ),
      },
      {
        rotulo: 'Pedidos',
        rota: '/pedidos',
        icone: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <path d="M16 10a4 4 0 0 1-8 0" />
          </svg>
        ),
      },
      {
        rotulo: 'Agenda',
        rota: '/agenda',
        icone: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        ),
      },
    ],
  },
  {
    titulo: 'Financeiro',
    itens: [
      {
        rotulo: 'Contas',
        rota: '/contas',
        icone: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
            <line x1="1" y1="10" x2="23" y2="10" />
          </svg>
        ),
      },
      {
        rotulo: 'Transações',
        rota: '/transacoes',
        icone: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="17 1 21 5 17 9" />
            <path d="M3 11V9a4 4 0 0 1 4-4h14" />
            <polyline points="7 23 3 19 7 15" />
            <path d="M21 13v2a4 4 0 0 1-4 4H3" />
          </svg>
        ),
      },
    ],
  },
  {
    titulo: 'Sistema',
    itens: [
      {
        rotulo: 'Backup',
        rota: '/backup',
        icone: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21.2 15c.7-1.2 1-2.5.7-3.9-.6-2-2.4-3.5-4.4-3.9-1.2-2.3-3.6-3.8-6.4-3.3-2.6.4-4.8 2.4-5.3 5-1.9.4-3.4 2-3.7 4-.3 2.1.8 4.1 2.7 5.1" />
            <polyline points="12 12 12 21" />
            <polyline points="8 17 12 21 16 17" />
          </svg>
        ),
      },
      {
        rotulo: 'Auditoria',
        rota: '/auditoria',
        icone: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <polyline points="9 12 11 14 15 10" />
          </svg>
        ),
      },
      {
        rotulo: 'Logs do Sistema',
        rota: '/logs',
        icone: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="8" y1="6" x2="21" y2="6" />
            <line x1="8" y1="12" x2="21" y2="12" />
            <line x1="8" y1="18" x2="21" y2="18" />
            <line x1="3" y1="6" x2="3.01" y2="6" />
            <line x1="3" y1="12" x2="3.01" y2="12" />
            <line x1="3" y1="18" x2="3.01" y2="18" />
          </svg>
        ),
      },
      {
        rotulo: 'Configurações',
        rota: '/configuracoes',
        icone: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        ),
      },
    ],
  },
]

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const sair = useAuthStore((estado) => estado.sair)
  const { location } = useRouterState()
  const [menuAberto, setMenuAberto] = useState(false)
  const [retraido, setRetraido] = useState(() => {
    try {
      return localStorage.getItem('miaudelier_sidebar_retraido') === 'true'
    } catch {
      return false
    }
  })
  const [perfilAtivo, setPerfilAtivo] = useState<any>(null)

  useEffect(() => {
    getPerfilAtivo().then(setPerfilAtivo).catch(console.error)
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem('miaudelier_sidebar_retraido', String(retraido))
    } catch {
      // ignorar erro de escrita no localStorage
    }
  }, [retraido])

  useEffect(() => {
    async function checarBackupAutomatico() {
      try {
        const ultimoBackup = localStorage.getItem('miaudelier_ultimo_backup_automatico')
        const agora = new Date().getTime()
        const vinteQuatroHoras = 24 * 60 * 60 * 1000

        if (!ultimoBackup || agora - parseInt(ultimoBackup, 10) > vinteQuatroHoras) {
          const json = await exportarBackup()
          const blob = new Blob([json], { type: 'application/json' })
          const url = URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = url
          link.download = 'backupAutomatico.json'
          document.body.appendChild(link)
          link.click()
          link.remove()
          setTimeout(() => URL.revokeObjectURL(url), 0)
          
          localStorage.setItem('miaudelier_ultimo_backup_automatico', agora.toString())
        }
      } catch (err) {
        console.error('Erro ao realizar backup automático', err)
      }
    }
    
    checarBackupAutomatico()
    const intervalo = setInterval(checarBackupAutomatico, 60 * 60 * 1000)
    return () => clearInterval(intervalo)
  }, [])

  function irPara(rota: string) {
    navigate({ to: rota })
    setMenuAberto(false)
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-on-surface md:flex-row">
      {/* Header Mobile */}
      <header className="sticky top-0 z-40 flex min-h-[4rem] w-full shrink-0 items-center justify-between border-b border-outline-variant/10 bg-background px-4 pt-[env(safe-area-inset-top)] md:hidden">
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label={menuAberto ? 'Fechar menu' : 'Abrir menu'}
            onClick={() => setMenuAberto((aberto) => !aberto)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container"
          >
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {menuAberto ? (
                <path d="M6 6l12 12M18 6L6 18" />
              ) : (
                <path d="M4 7h16M4 12h16M4 17h16" />
              )}
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <img src={logoMiauDelier} alt="MiauDelier" className="h-7 w-7 object-contain drop-shadow" />
            <span className="text-headline-sm font-semibold tracking-tight text-primary">MiauDelier</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => irPara('/perfil')}
          className="text-xs px-2.5 py-1 rounded-full bg-primary-container text-on-primary-container font-medium hover:opacity-90"
        >
          {perfilAtivo?.nome || 'MiauDelier'}
        </button>
      </header>

      {/* Overlay Mobile */}
      {menuAberto && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMenuAberto(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Desktop Floating Drawer (Estilo Thor) */}
      <nav
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col justify-between overflow-y-auto overflow-x-hidden transition-all duration-300 ease-in-out',
          'border-r border-outline-variant/10 bg-surface-container/95 backdrop-blur-xl',
          'md:static md:z-auto md:my-3 md:ml-3 md:min-h-[calc(100vh-1.5rem)] md:rounded-2xl md:border md:border-outline-variant/15 md:shadow-xl',
          menuAberto ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
          retraido ? 'w-64 md:w-20 p-2.5' : 'w-64 md:w-64 p-3.5',
        )}
      >
        <div className="flex flex-col gap-3">
          {/* Logo e Nome do Aplicativo no Topo */}
          <div className={cn('flex items-center gap-3 px-1 py-1', retraido && 'justify-center')}>
            <img
              src={logoMiauDelier}
              alt="MiauDelier Logo"
              className="h-8 w-8 shrink-0 object-contain drop-shadow transition-transform hover:scale-105"
            />
            {!retraido && (
              <span className="text-headline-sm font-semibold tracking-tight text-primary truncate">
                MiauDelier
              </span>
            )}
          </div>

          {/* Card / Avatar do Perfil Ativo */}
          {!retraido ? (
            <div
              onClick={() => irPara('/perfil')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && irPara('/perfil')}
              className="flex cursor-pointer items-center justify-between rounded-xl bg-surface-container-high/60 p-3 border border-outline-variant/10 transition-all hover:bg-surface-container-highest hover:border-primary/20"
            >
              <div className="flex flex-col overflow-hidden">
                <span className="text-[10px] uppercase font-bold text-on-surface-variant/70 tracking-wider">
                  Perfil Ativo
                </span>
                <span className="truncate text-sm font-bold text-on-surface">{perfilAtivo?.nome || 'MiauDelier'}</span>
              </div>
              <span className="text-xs text-primary font-medium underline shrink-0 ml-1">Gerenciar</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => irPara('/perfil')}
              title={`Perfil Ativo: ${perfilAtivo?.nome || 'MiauDelier'}`}
              className="flex h-10 w-full items-center justify-center rounded-xl bg-primary-container/20 text-primary border border-primary/20 hover:bg-primary-container/40 transition-colors"
            >
              <span className="text-xs font-bold uppercase">{perfilAtivo?.nome?.charAt(0) || 'M'}</span>
            </button>
          )}

          {/* Seções com Containers / Cards Internos (Estilo Thor) */}
          <div className="flex flex-col gap-3 pt-1">
            {SECOES_MENU.map((secao) => (
              <div
                key={secao.titulo}
                className={cn(
                  'flex flex-col rounded-2xl transition-all',
                  !retraido && 'bg-surface-container-high/30 p-1.5 border border-outline-variant/10',
                )}
              >
                {!retraido && (
                  <span className="px-2 pt-1 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/60">
                    {secao.titulo}
                  </span>
                )}
                <div className="flex flex-col gap-1">
                  {secao.itens.map((item) => (
                    <NavItem
                      key={item.rota}
                      rotulo={item.rotulo}
                      icone={item.icone}
                      ativo={location.pathname === item.rota}
                      retraido={retraido}
                      onClick={() => irPara(item.rota)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Rodapé: Botão de Retrair/Expandir + Sair */}
        <div className="mt-4 flex flex-col gap-2 pt-3 border-t border-outline-variant/10 shrink-0">
          {/* Botão Retrair / Expandir Sidebar */}
          <button
            type="button"
            onClick={() => setRetraido((r) => !r)}
            className={cn(
              'flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-all cursor-pointer select-none',
              retraido && 'justify-center px-2',
            )}
            title={retraido ? 'Expandir Sidebar' : 'Retrair Sidebar'}
          >
            <svg
              className={cn('h-5 w-5 shrink-0 transition-transform duration-300', retraido && 'rotate-180')}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <line x1="9" y1="3" x2="9" y2="21" />
              <path d="M16 15l-3-3 3-3" />
            </svg>
            {!retraido && <span>Retrair Sidebar</span>}
          </button>

          {/* Botão Sair */}
          <Button
            variante="ghost"
            onClick={sair}
            className={cn('w-full justify-start text-error hover:bg-error/10 hover:text-error', retraido && 'justify-center px-2')}
          >
            <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            {!retraido && <span className="ml-2">Sair</span>}
          </Button>
        </div>
      </nav>

      {/* Conteúdo Principal */}
      <main className="flex-1 p-4 md:p-6 overflow-x-hidden flex flex-col justify-between min-h-[calc(100vh-2rem)] pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <div>{children}</div>

        {/* Rodapé Global com Informações de Conformidade, Direitos e Empresa */}
        <footer className="mt-12 pt-6 border-t border-outline-variant/15 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-on-surface-variant">
          <div className="flex flex-col items-center md:items-start gap-1">
            <span className="font-semibold text-on-surface flex flex-wrap items-center justify-center md:justify-start gap-2">
              © 2026 Raffa Studio Produções. Empresa registrada desde 2026.
              <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded text-[10px] font-bold tracking-widest">
                v{__APP_VERSION__}
              </span>
            </span>
            <span className="text-[11px] text-on-surface-variant/80">
              Todos os direitos reservados · Suporte Técnico: <a href="mailto:contato.raffasp@gmail.com" className="text-primary hover:underline font-medium">contato.raffasp@gmail.com</a>
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-xs">
            <button type="button" onClick={() => irPara('/ajuda')} className="hover:text-primary transition-colors cursor-pointer">
              💡 Ajuda & FAQ
            </button>
            <span className="text-outline-variant/40">•</span>
            <button type="button" onClick={() => irPara('/privacidade')} className="hover:text-primary transition-colors cursor-pointer">
              🔒 Política de Privacidade & LGPD
            </button>
            <span className="text-outline-variant/40">•</span>
            <button type="button" onClick={() => irPara('/termos')} className="hover:text-primary transition-colors cursor-pointer">
              📜 Termos de Uso
            </button>
          </div>
        </footer>
      </main>

      {/* Banner de Transparência e Consentimento LGPD */}
      <BannerConsentimentoLGPD />
    </div>
  )
}



