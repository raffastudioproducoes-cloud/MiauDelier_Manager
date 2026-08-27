import { Link } from '@tanstack/react-router'
import { cn } from '../../lib/cn'

interface ItemBreadcrumb {
  rotulo: string
  href?: string
}

interface BreadcrumbProps {
  itens: ItemBreadcrumb[]
  className?: string
}

export function Breadcrumb({ itens, className }: BreadcrumbProps) {
  return (
    <nav aria-label="breadcrumb" className={cn('text-sm text-[var(--color-ink-muted)]', className)}>
      {itens.map((item, indice) => (
        <span key={item.rotulo}>
          {indice > 0 && ' / '}
          {indice < itens.length - 1 && item.href ? (
            <Link to={item.href} className="hover:text-[var(--color-accent)]">
              {item.rotulo}
            </Link>
          ) : (
            <span className="text-[var(--color-ink)]">{item.rotulo}</span>
          )}
        </span>
      ))}
    </nav>
  )
}
