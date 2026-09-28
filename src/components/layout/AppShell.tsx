import { useState, type ReactNode } from 'react'
import { useNavigate, useRouterState } from '@tanstack/react-router'
import { useAuthStore } from '../../stores/authStore'
import { getPerfilAtivo } from '../../lib/perfisRepo'
import { cn } from '../../lib/cn'
import { NavItem } from './NavItem'
import { Button } from '../ui/Button'

interface SecaoMenu {
  titulo: string
  itens: Array<{ rotulo: string; rota: string }>
}

const SECOES_MENU: SecaoMenu[] = [
  {
    titulo: 'Geral',
    itens: [
      { rotulo: 'Perfil do Ateliê', rota: '/perfil' },
      { rotulo: 'Início', rota: '/' },
      { rotulo: 'Analytics', rota: '/analytics' },
      { rotulo: 'Diagnóstico', rota: '/diagnostico' },
      { rotulo: 'Assistente', rota: '/assistente' },
    ],
  },
  {
    titulo: 'Produção',
    itens: [
      { rotulo: 'Materiais', rota: '/materiais' },
      { rotulo: 'Categorias', rota: '/categorias' },
      { rotulo: 'Formas', rota: '/formas' },
      { rotulo: 'Peças', rota: '/pecas' },
      { rotulo: 'Equipamentos', rota: '/equipamentos' },
    ],
  },
  {
    titulo: 'Vendas',
    itens: [
      { rotulo: 'Precificação', rota: '/precificacao' },
      { rotulo: 'Taxas & Canais', rota: '/taxas' },
      { rotulo: 'Clientes', rota: '/clientes' },
      { rotulo: 'Pedidos', rota: '/pedidos' },
      { rotulo: 'Agenda', rota: '/agenda' },
    ],
  },
  {
    titulo: 'Financeiro',
    itens: [
      { rotulo: 'Contas', rota: '/contas' },
      { rotulo: 'Transações', rota: '/transacoes' },
    ],
  },
  {
    titulo: 'Sistema',
    itens: [
      { rotulo: 'Backup', rota: '/backup' },
      { rotulo: 'Auditoria', rota: '/auditoria' },
      { rotulo: 'Logs do Sistema', rota: '/logs' },
      { rotulo: 'Configurações', rota: '/configuracoes' },
    ],
  },
]

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const sair = useAuthStore((estado) => estado.sair)
  const { location } = useRouterState()
  const [menuAberto, setMenuAberto] = useState(false)
  const perfilAtivo = getPerfilAtivo()

  function irPara(rota: string) {
    navigate({ to: rota })
    setMenuAberto(false)
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-on-surface md:flex-row">
      <header className="sticky top-0 z-40 flex h-16 w-full shrink-0 items-center justify-between border-b border-outline-variant/10 bg-background px-4 md:hidden">
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
          <span className="text-headline-sm font-semibold tracking-tight text-primary">MiauDelier</span>
        </div>
        <button
          type="button"
          onClick={() => irPara('/perfil')}
          className="text-xs px-2.5 py-1 rounded-full bg-primary-container text-on-primary-container font-medium hover:opacity-90"
        >
          {perfilAtivo.nome}
        </button>
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
          'fixed inset-y-0 left-0 z-50 flex w-64 -translate-x-full flex-col gap-1 overflow-y-auto border-r border-outline-variant/10 bg-surface-container/95 p-3 backdrop-blur-md transition-transform duration-200 ease-out',
          menuAberto && 'translate-x-0',
          'md:static md:z-auto md:min-h-screen md:w-60 md:translate-x-0 md:p-4',
        )}
      >
        <div className="flex items-center justify-between px-2 pb-2">
          <span className="text-headline-sm font-semibold tracking-tight text-primary">
            MiauDelier
          </span>
        </div>

        {/* Card do Perfil Ativo no Drawer */}
        <div
          onClick={() => irPara('/perfil')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && irPara('/perfil')}
          className="mb-2 flex cursor-pointer items-center justify-between rounded-xl bg-surface-container-high p-3 border border-outline-variant/10 transition-colors hover:bg-surface-container-highest"
        >
          <div className="flex flex-col overflow-hidden">
            <span className="text-xs text-on-surface-variant font-medium">Perfil Ativo</span>
            <span className="truncate text-sm font-bold text-on-surface">{perfilAtivo.nome}</span>
          </div>
          <span className="text-xs text-primary font-medium underline">Gerenciar</span>
        </div>

        {/* Seções de Links Organizadas */}
        <div className="flex flex-col gap-4">
          {SECOES_MENU.map((secao) => (
            <div key={secao.titulo} className="flex flex-col gap-1">
              <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/70">
                {secao.titulo}
              </span>
              <div className="flex flex-col gap-0.5 border-t border-outline-variant/10 pt-1">
                {secao.itens.map((item) => (
                  <NavItem
                    key={item.rota}
                    rotulo={item.rotulo}
                    ativo={location.pathname === item.rota}
                    onClick={() => irPara(item.rota)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-2 border-t border-outline-variant/10 shrink-0">
          <Button variante="ghost" onClick={sair} className="w-full justify-start">Sair</Button>
        </div>
      </nav>
      <main className="flex-1 p-4">{children}</main>
    </div>
  )
}

