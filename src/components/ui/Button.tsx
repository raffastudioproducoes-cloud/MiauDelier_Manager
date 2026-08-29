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
        'rounded-lg px-4 py-2 font-medium transition-shadow',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        !disabled && 'elevation-raised active:elevation-pressed',
        variante === 'primary' && 'text-[var(--color-base)] bg-[var(--color-accent)]!',
        variante === 'ghost' && 'text-[var(--color-ink)] bg-transparent',
        className,
      )}
      {...resto}
    />
  )
}
