import * as Dialog from '@radix-ui/react-dialog'
import { Button } from './Button'

interface ConfirmModalProps {
  aberto: boolean
  titulo: string
  descricao?: string
  onConfirmar: () => void
  onCancelar: () => void
}

export function ConfirmModal({ aberto, titulo, descricao, onConfirmar, onCancelar }: ConfirmModalProps) {
  return (
    <Dialog.Root open={aberto} onOpenChange={(abertoAgora) => !abertoAgora && onCancelar()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-xl elevation-raised p-6 w-full max-w-sm">
          <Dialog.Title className="text-base font-semibold text-[var(--color-ink)]">{titulo}</Dialog.Title>
          {descricao && (
            <Dialog.Description className="mt-2 text-sm text-[var(--color-ink-muted)]">
              {descricao}
            </Dialog.Description>
          )}
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" onClick={onCancelar}>
              Cancelar
            </Button>
            <Button onClick={onConfirmar}>Confirmar</Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
