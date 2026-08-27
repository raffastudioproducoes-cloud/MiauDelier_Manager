import type { InputHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  id: string
  rotulo: string
  erro?: string
}

export function TextField({ id, rotulo, erro, className, ...resto }: TextFieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-[var(--color-ink)]">
        {rotulo}
      </label>
      <input
        id={id}
        className={cn(
          'rounded-lg px-3 py-2 elevation-inset text-[var(--color-ink)]',
          'focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]',
          erro && 'ring-2 ring-[var(--color-danger)]',
          className,
        )}
        aria-invalid={Boolean(erro)}
        aria-describedby={erro ? `${id}-erro` : undefined}
        {...resto}
      />
      {erro && (
        <p id={`${id}-erro`} role="alert" className="text-sm text-[var(--color-danger)]">
          {erro}
        </p>
      )}
    </div>
  )
}
