import { useState, type ReactNode } from 'react'
import { useNavigate, useRouterState } from '@tanstack/react-router'
import { useAuthStore } from '../../stores/authStore'
import { cn } from '../../lib/cn'
import { NavItem } from './NavItem'
import { Button } from '../ui/Button'

const ITENS_MENU = [
  { rotulo: 'Início', rota: '/' },
  { rotulo: 'Analytics', rota: '/analytics' },
  { rotulo: 'Materiais', rota: '/materiais' },
  { rotulo: 'Categorias', rota: '/categorias' },
  { rotulo: 'Formas', rota: '/formas' },
  { rotulo: 'Peças', rota: '/pecas' },
  { rotulo: 'Precificação', rota: '/precificacao' },
  { rotulo: 'Clientes', rota: '/clientes' },
  { rotulo: 'Pedidos', rota: '/pedidos' },
  { rotulo: 'Agenda', rota: '/agenda' },
  { rotulo: 'Assistente', rota: '/assistente' },
  { rotulo: 'Contas', rota: '/contas' },
  { rotulo: 'Transações', rota: '/transacoes' },
  { rotulo: 'Backup', rota: '/backup' },
  { rotulo: 'Auditoria', rota: '/auditoria' },
  { rotulo: 'Configurações', rota: '/configuracoes' },
  { rotulo: 'Mais', rota: '/mais' },
] as const

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const sair = useAuthStore((estado) => estado.sair)
  const { location } = useRouterState()
  const [menuAberto, setMenuAberto] = useState(false)

  function irPara(rota: string) {
    navigate({ to: rota })
    setMenuAberto(false)
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-on-surface md:flex-row">
      <header className="sticky top-0 z-40 flex h-16 w-full shrink-0 items-center gap-3 border-b border-outline-variant/10 bg-background px-4 md:hidden">
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
        <span className="text-headline-sm font-semibold tracking-tight text-primary">MiauDelier</span>
      </header>

      {menuAberto && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMenuAberto(false)}
          aria-hidden="true"
        />
      )}

      <nav
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 -translate-x-full flex-col gap-1 border-r border-outline-variant/10 bg-surface-container/95 p-3 backdrop-blur-md transition-transform duration-200 ease-out',
          menuAberto && 'translate-x-0',
          'md:static md:z-auto md:h-screen md:w-56 md:translate-x-0 md:gap-2 md:p-4',
        )}
      >
        <span className="px-3 pb-2 text-headline-sm font-semibold tracking-tight text-primary">
          MiauDelier
        </span>
        {ITENS_MENU.map((item) => (
          <NavItem
            key={item.rota}
            rotulo={item.rotulo}
            ativo={location.pathname === item.rota}
            onClick={() => irPara(item.rota)}
          />
        ))}
        <div className="mt-auto">
          <Button variante="ghost" onClick={sair}>Sair</Button>
        </div>
      </nav>
      <main className="flex-1 p-4">{children}</main>
    </div>
  )
}
