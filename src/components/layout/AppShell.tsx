import type { ReactNode } from 'react'
import { useNavigate, useRouterState } from '@tanstack/react-router'
import { useAuthStore } from '../../stores/authStore'
import { NavItem } from './NavItem'
import { Button } from '../ui/Button'
import { DicaIA } from '../../features/ia/DicaIA'

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
  { rotulo: 'Contas', rota: '/contas' },
  { rotulo: 'Transações', rota: '/transacoes' },
  { rotulo: 'Backup', rota: '/backup' },
  { rotulo: 'Auditoria', rota: '/auditoria' },
  { rotulo: 'Configurações', rota: '/configuracoes' },
] as const

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const sair = useAuthStore((estado) => estado.sair)
  const { location } = useRouterState()

  return (
    <div className="flex min-h-screen flex-col bg-background text-on-surface md:flex-row">
      <header className="sticky top-0 z-40 flex h-16 w-full shrink-0 items-center gap-3 border-b border-outline-variant/10 bg-background px-5 md:hidden">
        <span className="text-headline-sm font-semibold tracking-tight text-primary">MiauDelier</span>
      </header>

      <nav className="order-2 flex shrink-0 gap-1 overflow-x-auto border-t border-outline-variant/10 bg-surface-container/95 p-2 backdrop-blur-md md:order-1 md:h-screen md:w-56 md:flex-col md:gap-2 md:overflow-visible md:border-t-0 md:border-r md:p-4">
        <span className="hidden px-3 pb-2 text-headline-sm font-semibold tracking-tight text-primary md:block">
          MiauDelier
        </span>
        {ITENS_MENU.map((item) => (
          <NavItem
            key={item.rota}
            rotulo={item.rotulo}
            ativo={location.pathname === item.rota}
            onClick={() => navigate({ to: item.rota })}
          />
        ))}
        <div className="md:mt-auto">
          <DicaIA />
          <Button variante="ghost" onClick={sair}>Sair</Button>
        </div>
      </nav>
      <main className="order-1 flex-1 p-4 md:order-2">{children}</main>
    </div>
  )
}
