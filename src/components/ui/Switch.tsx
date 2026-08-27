import { cn } from '../../lib/cn'

interface SwitchProps {
  id: string
  label: string
  checked: boolean
  onChange: (marcado: boolean) => void
}

export function Switch({ id, label, checked, onChange }: SwitchProps) {
  return (
    <div className="flex items-center gap-2">
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative h-6 w-11 shrink-0 rounded-full elevation-inset transition-colors',
          checked ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-base)]',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 h-5 w-5 rounded-full bg-[var(--color-base)] elevation-raised transition-transform',
            checked ? 'translate-x-5' : 'translate-x-0.5',
          )}
        />
      </button>
      <label htmlFor={id} className="text-sm text-[var(--color-ink)] cursor-pointer">
        {label}
      </label>
    </div>
  )
}
