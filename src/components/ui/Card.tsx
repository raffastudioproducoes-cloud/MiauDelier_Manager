import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/cn'

type CardProps = HTMLAttributes<HTMLDivElement> & {
  variant?: 'default' | 'kpi'
  icon?: ReactNode
  value?: ReactNode
  label?: ReactNode
  trend?: ReactNode
}

const VARIANT_BASE: Record<string, string> = {
  default: 'glass-card rounded-xl text-on-surface p-4',
  kpi:
    'kpi-card relative overflow-hidden glass-card rounded-xl text-on-surface p-4',
}

function kpiInner({ icon, label, value, trend }: { icon?: ReactNode; label?: ReactNode; value?: ReactNode; trend?: ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      {icon && (
        <div className="mt-0.5 shrink-0">
          {icon}
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        {label && (
          <p className="text-label-sm text-on-surface-variant">
            {label}
          </p>
        )}
        <p className="text-headline-sm font-semibold text-primary leading-tight">
          {value}
        </p>
        {trend && (
          <div className="mt-0.5 flex items-center gap-1">
            {trend}
          </div>
        )}
      </div>
    </div>
  )
}

export function Card({ variant = 'default', className, icon, value, label, trend, children, ...resto }: CardProps) {
  const classes = cn(VARIANT_BASE[variant], className)

  if (variant === 'kpi') {
    return (
      <div className={classes} {...resto}>
        {kpiInner({ icon, label, value, trend })}
      </div>
    )
  }

  return (
    <div className={classes} {...resto}>
      {children}
    </div>
  )
}
