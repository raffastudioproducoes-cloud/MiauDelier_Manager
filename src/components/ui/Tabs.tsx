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
}

export function Tabs({ abas, abaInicial, abaAtiva, onMudarAba }: TabsProps) {
  const props =
    abaAtiva !== undefined
      ? { value: abaAtiva, onValueChange: onMudarAba }
      : { defaultValue: abaInicial ?? abas[0]?.id }

  return (
    <TabsPrimitivo.Root {...props}>
      <TabsPrimitivo.List className="flex gap-1 border-b border-thin">
        {abas.map((aba) => (
          <TabsPrimitivo.Trigger
            key={aba.id}
            value={aba.id}
            className="px-4 py-2 text-sm font-medium data-[state=active]:elevation-raised data-[state=active]:rounded-t-lg"
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
