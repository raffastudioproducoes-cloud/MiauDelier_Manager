import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

interface EmptyStateProps {
  titulo: string
  descricao?: string
  acao?: ReactNode
  className?: string
}

export function EmptyState({ titulo, descricao, acao, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center gap-2 py-12 text-center', className)}>
      <p className="text-base font-semibold text-[var(--color-ink)]">{titulo}</p>
      {descricao && <p className="text-sm text-[var(--color-ink-muted)]">{descricao}</p>}
      {acao}
    </div>
  )
}
