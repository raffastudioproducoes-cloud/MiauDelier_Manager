interface CheckboxProps {
  id: string
  label: string
  checked: boolean
  onChange: (marcado: boolean) => void
}

export function Checkbox({ id, label, checked, onChange }: CheckboxProps) {
  return (
    <label htmlFor={id} className="flex items-center gap-2 cursor-pointer">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(evento) => onChange(evento.target.checked)}
        className="h-4 w-4 rounded accent-[var(--color-accent)]"
      />
      <span className="text-sm text-[var(--color-ink)]">{label}</span>
    </label>
  )
}
