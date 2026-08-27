import { cn } from '../../lib/cn'

export function NavItem({ rotulo, ativo, onClick }: { rotulo: string; ativo: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition-shadow',
        ativo ? 'elevation-pressed text-[var(--color-accent)]' : 'text-[var(--color-ink-muted)] hover:elevation-raised',
      )}
    >
      {rotulo}
    </button>
  )
}
