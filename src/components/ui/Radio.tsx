interface RadioProps {
  id: string
  name: string
  label: string
  checked: boolean
  onChange: (marcado: boolean) => void
}

export function Radio({ id, name, label, checked, onChange }: RadioProps) {
  return (
    <label htmlFor={id} className="flex items-center gap-2 cursor-pointer">
      <input
        id={id}
        name={name}
        type="radio"
        checked={checked}
        onChange={(evento) => onChange(evento.target.checked)}
        className="h-4 w-4 accent-[var(--color-accent)]"
      />
      <span className="text-sm text-[var(--color-ink)]">{label}</span>
    </label>
  )
}
