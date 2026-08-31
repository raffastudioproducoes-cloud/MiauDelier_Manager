import * as TabsPrimitivo from '@radix-ui/react-tabs'
import type { ReactNode } from 'react'

interface Aba {
  id: string
  rotulo: string
  conteudo: ReactNode
}

interface TabsProps {
  abas: Aba[]
  abaInicial?: string
  abaAtiva?: string
  onMudarAba?: (id: string) => void
  className?: string
}

export function Tabs({ abas, abaInicial, abaAtiva, onMudarAba, className }: TabsProps) {
  const props =
    abaAtiva !== undefined
      ? { value: abaAtiva, onValueChange: onMudarAba }
      : { defaultValue: abaInicial ?? abas[0]?.id }

  return (
    <TabsPrimitivo.Root {...props} className={className}>
      <TabsPrimitivo.List className="inline-flex items-center gap-1 rounded-lg bg-surface-container p-1">
        {abas.map((aba) => (
          <TabsPrimitivo.Trigger
            key={aba.id}
            value={aba.id}
            className="cursor-pointer rounded-md px-4 py-1.5 text-sm font-medium text-on-surface-variant transition-colors data-[state=active]:bg-surface-high data-[state=active]:text-on-surface data-[state=active]:shadow"
          >
            {aba.rotulo}
          </TabsPrimitivo.Trigger>
        ))}
      </TabsPrimitivo.List>
      {abas.map((aba) => (
        <TabsPrimitivo.Content key={aba.id} value={aba.id} className="p-4">
          {aba.conteudo}
        </TabsPrimitivo.Content>
      ))}
    </TabsPrimitivo.Root>
  )
}
