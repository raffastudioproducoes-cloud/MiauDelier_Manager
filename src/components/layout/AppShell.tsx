import type { ReactNode } from 'react'
import { useNavigate, useRouterState } from '@tanstack/react-router'
import { useAuthStore } from '../../stores/authStore'
import { NavItem } from './NavItem'
import { Button } from '../ui/Button'

const ITENS_MENU = [
  { rotulo: 'Início', rota: '/' },
  { rotulo: 'Materiais', rota: '/materiais' },
  { rotulo: 'Formas', rota: '/formas' },
  { rotulo: 'Peças', rota: '/pecas' },
  { rotulo: 'Precificação', rota: '/precificacao' },
  { rotulo: 'Clientes', rota: '/clientes' },
  { rotulo: 'Pedidos', rota: '/pedidos' },
  { rotulo: 'Contas', rota: '/contas' },
  { rotulo: 'Transações', rota: '/transacoes' },
  { rotulo: 'Backup', rota: '/backup' },
] as const

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const sair = useAuthStore((estado) => estado.sair)
  const { location } = useRouterState()

  return (
    <div className="flex min-h-screen flex-col md:flex-row elevation-base">
      <nav className="flex md:w-56 md:flex-col md:p-4 md:gap-2 order-2 md:order-1 border-t md:border-t-0 md:border-r border-thin p-2 gap-1 flex-row md:flex-col justify-around md:justify-start">
        {ITENS_MENU.map((item) => (
          <NavItem
            key={item.rota}
            rotulo={item.rotulo}
            ativo={location.pathname === item.rota}
            onClick={() => navigate({ to: item.rota })}
          />
        ))}
        <div className="md:mt-auto">
          <Button variante="ghost" onClick={sair}>Sair</Button>
        </div>
      </nav>
      <main className="flex-1 order-1 md:order-2 p-4">{children}</main>
    </div>
  )
}
