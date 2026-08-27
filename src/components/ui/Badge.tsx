import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

const CORES_BADGE = {
  neutral: 'bg-[var(--color-surface)] text-[var(--color-ink-muted)]',
  success: 'bg-emerald-100 text-emerald-800',
  warning: 'bg-amber-100 text-amber-800',
  danger: 'bg-red-100 text-red-800',
} as const

interface BadgeProps {
  variant?: keyof typeof CORES_BADGE
  children: ReactNode
}

export function Badge({ variant = 'neutral', children }: BadgeProps) {
  return (
    <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold uppercase', CORES_BADGE[variant])}>
      {children}
    </span>
  )
}
