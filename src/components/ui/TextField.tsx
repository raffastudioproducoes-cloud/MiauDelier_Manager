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
      <label htmlFor={id} className="text-sm font-medium text-on-surface">
        {rotulo}
      </label>
      <input
        id={id}
        className={cn(
          'rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface shadow-sm transition-colors',
          'placeholder:text-on-surface-variant',
          'focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary',
          erro && 'border-error ring-1 ring-error',
          className,
        )}
        aria-invalid={Boolean(erro)}
        aria-describedby={erro ? `${id}-erro` : undefined}
        {...resto}
      />
      {erro && (
        <p id={`${id}-erro`} role="alert" className="text-sm text-error">
          {erro}
        </p>
      )}
    </div>
  )
}
