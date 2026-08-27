interface ItemBreadcrumb {
  rotulo: string
  href?: string
}

export function Breadcrumb({ itens }: { itens: ItemBreadcrumb[] }) {
  return (
    <nav aria-label="breadcrumb" className="text-sm text-[var(--color-ink-muted)]">
      {itens.map((item, indice) => (
        <span key={item.rotulo}>
          {indice > 0 && ' / '}
          {indice < itens.length - 1 && item.href ? (
            <a href={item.href} className="hover:text-[var(--color-accent)]">
              {item.rotulo}
            </a>
          ) : (
            <span className="text-[var(--color-ink)]">{item.rotulo}</span>
          )}
        </span>
      ))}
    </nav>
  )
}
