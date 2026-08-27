import type { HTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

export function Card({ className, children, ...resto }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('rounded-xl elevation-raised p-4', className)} {...resto}>
      {children}
    </div>
  )
}
