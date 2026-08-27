import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { Skeleton } from './Skeleton'

describe('Skeleton', () => {
  it('aplica width e height inline', () => {
    const { container } = render(<Skeleton width={100} height="2rem" />)
    const el = container.firstChild as HTMLElement
    expect(el.style.width).toBe('100px')
    expect(el.style.height).toBe('2rem')
  })

  it('tem aria-hidden por ser decorativo', () => {
    const { container } = render(<Skeleton width={100} height={20} />)
    const el = container.firstChild as HTMLElement
    expect(el).toHaveAttribute('aria-hidden', 'true')
  })
})
