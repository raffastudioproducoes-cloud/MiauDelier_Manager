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
        // Base: flex center, área interativa mínima 44x44, cantos bem arredondados, fonte com bom peso
        'inline-flex items-center justify-center gap-2',
        'min-h-[44px] min-w-[44px] px-5 py-2',
        'rounded-xl text-sm font-semibold cursor-pointer',
        
        // Microinterações e Acessibilidade: 100ms, focus-visible claro, scale no clique
        'transition-all duration-100 ease-out',
        'active:scale-[0.98]',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none disabled:active:scale-100',
        
        // Variante Primary: profundidade sutil (borda e sombra), hover lift e glow original
        variante === 'primary' && [
          'bg-primary text-on-primary',
          'border border-black/10 shadow-sm',
          'hover:bg-primary/90 hover:-translate-y-[1px] glow-hover',
          'active:translate-y-0 active:shadow-none'
        ],
        
        // Variante Ghost: sem fundo por padrão, surface no hover
        variante === 'ghost' && [
          'bg-transparent text-on-surface',
          'hover:bg-surface-container hover:text-on-surface',
          'active:bg-surface-container-high'
        ],
        className,
      )}
      {...resto}
    />
  )
}
