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
    <nav aria-label="breadcrumb" className={cn('text-sm text-on-surface-variant', className)}>
      {itens.map((item, indice) => (
        <span key={item.rotulo}>
          {indice > 0 && ' / '}
          {indice < itens.length - 1 && item.href ? (
            <Link to={item.href} className="transition-colors hover:text-primary">
              {item.rotulo}
            </Link>
          ) : (
            <span className="font-medium text-on-surface">{item.rotulo}</span>
          )}
        </span>
      ))}
    </nav>
  )
}
