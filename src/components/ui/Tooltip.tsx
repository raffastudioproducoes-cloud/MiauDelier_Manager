import * as TooltipPrimitivo from '@radix-ui/react-tooltip'
import type { ReactNode } from 'react'

interface TooltipProps {
  conteudo: string
  children: ReactNode
}

export function Tooltip({ conteudo, children }: TooltipProps) {
  return (
    <TooltipPrimitivo.Provider delayDuration={200}>
      <TooltipPrimitivo.Root>
        <TooltipPrimitivo.Trigger asChild>{children}</TooltipPrimitivo.Trigger>
        <TooltipPrimitivo.Portal>
          <TooltipPrimitivo.Content className="rounded-md elevation-raised px-2 py-1 text-xs">
            {conteudo}
          </TooltipPrimitivo.Content>
        </TooltipPrimitivo.Portal>
      </TooltipPrimitivo.Root>
    </TooltipPrimitivo.Provider>
  )
}
