import type { ReactNode } from 'react'

const PROPS_SVG = {
  viewBox: '0 0 24 24',
  width: 24,
  height: 24,
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

export const ICONES_MAIS: Record<string, ReactNode> = {
  '/materiais': (
    <svg {...PROPS_SVG}><path d="M3 8l9-5 9 5-9 5-9-5Z" /><path d="M3 8v8l9 5 9-5V8" /><path d="M12 13v8" /></svg>
  ),
  '/formas': (
    <svg {...PROPS_SVG}><path d="M12 3a9 9 0 1 0 0 18 5 5 0 0 0 0-10 3 3 0 1 1 0-6 2 2 0 0 0 0-2Z" /></svg>
  ),
  '/pecas': (
    <svg {...PROPS_SVG}><rect x="4" y="4" width="7" height="7" rx="1" /><rect x="13" y="4" width="7" height="7" rx="1" /><rect x="4" y="13" width="7" height="7" rx="1" /><rect x="13" y="13" width="7" height="7" rx="1" /></svg>
  ),
  '/categorias': (
    <svg {...PROPS_SVG}><path d="M12 3 21 8v8l-9 5-9-5V8l9-5Z" /><circle cx="12" cy="11" r="2.5" /></svg>
  ),
  '/clientes': (
    <svg {...PROPS_SVG}><circle cx="12" cy="8" r="3.5" /><path d="M5 20c0-3.9 3.1-6 7-6s7 2.1 7 6" /></svg>
  ),
  '/pedidos': (
    <svg {...PROPS_SVG}><path d="M6 8h12l-1 12H7L6 8Z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></svg>
  ),
  '/precificacao': (
    <svg {...PROPS_SVG}><path d="M20 12 12 20l-8-8 4-8h8l4 8Z" /><circle cx="15" cy="9" r="1.4" /></svg>
  ),
  '/agenda': (
    <svg {...PROPS_SVG}><rect x="3.5" y="5" width="17" height="16" rx="2" /><path d="M3.5 10h17M8 3v4M16 3v4" /></svg>
  ),
  '/contas': (
    <svg {...PROPS_SVG}><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18" /><path d="M16 14.5h2" /></svg>
  ),
  '/transacoes': (
    <svg {...PROPS_SVG}><path d="M4 8h13l-3-3M20 16H7l3 3" /></svg>
  ),
  '/analytics': (
    <svg {...PROPS_SVG}><path d="M4 20V10M11 20V4M18 20v-7" /><path d="M3 20h18" /></svg>
  ),
  '/configuracoes': (
    <svg {...PROPS_SVG}><circle cx="12" cy="12" r="3" /><path d="M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M3 12h2M19 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" /></svg>
  ),
  '/backup': (
    <svg {...PROPS_SVG}><path d="M7 18a4.5 4.5 0 0 1-.6-8.96A5.5 5.5 0 0 1 17.1 8.1 4 4 0 0 1 17 18H7Z" /><path d="M12 11v6M9.5 14.5 12 17l2.5-2.5" /></svg>
  ),
  '/auditoria': (
    <svg {...PROPS_SVG}><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z" /><path d="M9 12l2 2 4-4" /></svg>
  ),
  '/assistente': (
    <svg {...PROPS_SVG}><path d="M4 6h16v10H9l-5 4V6Z" /><path d="M8 10h8M8 13h5" /></svg>
  ),
}
