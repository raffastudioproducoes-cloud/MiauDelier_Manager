import type { ReactNode } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Button } from './Button'
import { cn } from '../../lib/cn'

interface ConfirmModalProps {
  aberto: boolean
  titulo: string
  descricao?: string
  onConfirmar: () => void
  onCancelar: () => void
  className?: string
  children?: ReactNode
}

export function ConfirmModal({
  aberto,
  titulo,
  descricao,
  onConfirmar,
  onCancelar,
  className,
  children,
}: ConfirmModalProps) {
  return (
    <Dialog.Root open={aberto} onOpenChange={(abertoAgora) => !abertoAgora && onCancelar()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60" />
        <Dialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border border-outline-variant bg-surface-container p-6 shadow-lg',
            className,
          )}
        >
          <Dialog.Title className="text-base font-semibold text-on-surface">{titulo}</Dialog.Title>
          {descricao && (
            <Dialog.Description className="mt-2 text-sm text-on-surface-variant">
              {descricao}
            </Dialog.Description>
          )}
          {children && <div className="mt-3">{children}</div>}
          <div className="mt-4 flex justify-end gap-2">
            <Button variante="ghost" onClick={onCancelar}>
              Cancelar
            </Button>
            <Button onClick={onConfirmar}>Confirmar</Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
