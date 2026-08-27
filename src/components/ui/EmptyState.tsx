import type { ReactNode } from 'react'

interface EmptyStateProps {
  titulo: string
  descricao?: string
  acao?: ReactNode
}

export function EmptyState({ titulo, descricao, acao }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-2 py-12 text-center">
      <p className="text-base font-semibold text-[var(--color-ink)]">{titulo}</p>
      {descricao && <p className="text-sm text-[var(--color-ink-muted)]">{descricao}</p>}
      {acao}
    </div>
  )
}
