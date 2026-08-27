import { cn } from '../../lib/cn'

interface RadioProps {
  id: string
  name: string
  rotulo: string
  marcado: boolean
  aoMudar: (marcado: boolean) => void
  className?: string
}

export function Radio({ id, name, rotulo, marcado, aoMudar, className }: RadioProps) {
  return (
    <label htmlFor={id} className={cn('flex items-center gap-2 cursor-pointer', className)}>
      <input
        id={id}
        name={name}
        type="radio"
        checked={marcado}
        onChange={(evento) => aoMudar(evento.target.checked)}
        className="h-4 w-4 accent-[var(--color-accent)]"
      />
      <span className="text-sm text-[var(--color-ink)]">{rotulo}</span>
    </label>
  )
}
