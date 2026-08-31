import type { HTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

export function Card({ className, children, ...resto }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-xl border border-outline-variant bg-surface-container text-on-surface shadow-sm p-4',
        className,
      )}
      {...resto}
    >
      {children}
    </div>
  )
}
