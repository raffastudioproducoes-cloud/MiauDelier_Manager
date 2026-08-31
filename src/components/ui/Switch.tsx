import { cn } from '../../lib/cn'

interface SwitchProps {
  id: string
  rotulo: string
  marcado: boolean
  aoMudar: (marcado: boolean) => void
  className?: string
}

export function Switch({ id, rotulo, marcado, aoMudar, className }: SwitchProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={marcado}
        aria-label={rotulo}
        onClick={() => aoMudar(!marcado)}
        className={cn(
          'relative h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent shadow-inner transition-colors',
          marcado ? 'bg-primary' : 'bg-surface-high',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 h-5 w-5 rounded-full bg-background shadow transition-transform',
            marcado ? 'translate-x-5' : 'translate-x-0.5',
          )}
        />
      </button>
      <label htmlFor={id} className="text-sm text-on-surface cursor-pointer">
        {rotulo}
      </label>
    </div>
  )
}
