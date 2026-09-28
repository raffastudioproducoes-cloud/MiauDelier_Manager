import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

interface NavItemProps {
  rotulo: string
  icone?: ReactNode
  ativo: boolean
  retraido?: boolean
  onClick: () => void
  className?: string
}

export function NavItem({ rotulo, icone, ativo, retraido, onClick, className }: NavItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={retraido ? rotulo : undefined}
      className={cn(
        'group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-all duration-200 cursor-pointer select-none',
        ativo
          ? 'bg-primary-container/30 text-primary font-semibold shadow-sm border border-primary/20'
          : 'text-on-surface-variant hover:bg-surface-container-high/60 hover:text-on-surface',
        retraido && 'justify-center px-2 py-2.5',
        className,
      )}
    >
      {icone && (
        <span
          className={cn(
            'flex h-5 w-5 shrink-0 items-center justify-center transition-transform duration-200 group-hover:scale-110',
            ativo ? 'text-primary' : 'text-on-surface-variant group-hover:text-on-surface',
          )}
        >
          {icone}
        </span>
      )}
      {!retraido && <span className="truncate">{rotulo}</span>}

      {/* Tooltip flutuante no modo retraído ao passar o mouse */}
      {retraido && (
        <span className="pointer-events-none absolute left-full ml-3 z-50 hidden rounded-md bg-surface-container-highest px-2.5 py-1 text-xs font-semibold text-on-surface shadow-md border border-outline-variant/20 whitespace-nowrap group-hover:block">
          {rotulo}
        </span>
      )}
    </button>
  )
}

