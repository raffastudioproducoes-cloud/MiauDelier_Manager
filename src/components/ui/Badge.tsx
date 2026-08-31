import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

const CORES_BADGE = {
  neutral: 'bg-surface-container text-on-surface-variant',
  success: 'bg-[var(--color-success-soft)] text-[var(--color-success)]',
  warning: 'bg-[var(--color-warning-soft)] text-[var(--color-warning)]',
  danger: 'bg-[var(--color-danger-soft)] text-[var(--color-danger)]',
} as const

interface BadgeProps {
  variant?: keyof typeof CORES_BADGE
  children: ReactNode
  className?: string
}

export function Badge({ variant = 'neutral', children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'rounded-full px-2 py-0.5 text-xs font-semibold uppercase',
        CORES_BADGE[variant],
        className,
      )}
    >
      {children}
    </span>
  )
}
