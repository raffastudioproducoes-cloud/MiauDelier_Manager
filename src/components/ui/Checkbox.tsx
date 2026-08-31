import { cn } from '../../lib/cn'

interface CheckboxProps {
  id: string
  rotulo: string
  marcado: boolean
  aoMudar: (marcado: boolean) => void
  className?: string
}

export function Checkbox({ id, rotulo, marcado, aoMudar, className }: CheckboxProps) {
  return (
    <label htmlFor={id} className={cn('flex items-center gap-2 cursor-pointer', className)}>
      <input
        id={id}
        type="checkbox"
        checked={marcado}
        onChange={(evento) => aoMudar(evento.target.checked)}
        className="h-4 w-4 cursor-pointer rounded accent-primary"
      />
      <span className="text-sm text-on-surface">{rotulo}</span>
    </label>
  )
}
