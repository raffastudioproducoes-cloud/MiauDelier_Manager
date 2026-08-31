import { cn } from '../../lib/cn'

interface NavItemProps {
  rotulo: string
  ativo: boolean
  onClick: () => void
  className?: string
}

export function NavItem({ rotulo, ativo, onClick, className }: NavItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full shrink-0 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors',
        ativo
          ? 'bg-primary-container/20 text-primary'
          : 'text-on-surface-variant hover:bg-surface-container',
        className,
      )}
    >
      {rotulo}
    </button>
  )
}
