import * as TooltipPrimitivo from '@radix-ui/react-tooltip'
import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

interface TooltipProps {
  conteudo: string
  children: ReactNode
  className?: string
}

export function Tooltip({ conteudo, children, className }: TooltipProps) {
  return (
    <TooltipPrimitivo.Provider delayDuration={200}>
      <TooltipPrimitivo.Root>
        <TooltipPrimitivo.Trigger asChild>{children}</TooltipPrimitivo.Trigger>
        <TooltipPrimitivo.Portal>
          {/* className cai no Content: o Trigger é o children de quem chama, não é nosso. */}
          <TooltipPrimitivo.Content className={cn('rounded-md elevation-raised px-2 py-1 text-xs', className)}>
            {conteudo}
          </TooltipPrimitivo.Content>
        </TooltipPrimitivo.Portal>
      </TooltipPrimitivo.Root>
    </TooltipPrimitivo.Provider>
  )
}
