import type { ButtonHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: 'primary' | 'ghost'
}

export function Button({ variante = 'primary', className, disabled, ...resto }: ButtonProps) {
  return (
    <button
      type={resto.type ?? 'button'}
      disabled={disabled}
      className={cn(
        'rounded-lg px-4 py-2 text-sm font-medium transition-colors cursor-pointer',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
        variante === 'primary' &&
          'text-on-primary bg-primary shadow hover:bg-primary/90 glow-hover',
        variante === 'ghost' && 'text-on-surface bg-transparent hover:bg-surface-container',
        className,
      )}
      {...resto}
    />
  )
}
