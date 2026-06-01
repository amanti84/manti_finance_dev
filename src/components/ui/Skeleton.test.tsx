import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { Skeleton } from './Skeleton'

describe('Skeleton Component', () => {
  it('renders with default variant', () => {
    const { container } = render(<Skeleton />)
    expect(container.firstChild).toHaveClass('animate-pulse')
    expect(container.firstChild).toHaveClass('h-4')
  })

  it('renders with heading variant', () => {
    const { container } = render(<Skeleton variant="heading" />)
    expect(container.firstChild).toHaveClass('h-8')
  })

  it('renders with avatar variant', () => {
    const { container } = render(<Skeleton variant="avatar" />)
    expect(container.firstChild).toHaveClass('rounded-full')
  })

  it('applies custom width and height', () => {
    const { container } = render(<Skeleton width={200} height={100} />)
    const element = container.firstChild as HTMLElement
    expect(element.style.width).toBe('200px')
    expect(element.style.height).toBe('100px')
  })

  it('applies custom className', () => {
    const { container } = render(<Skeleton className="custom-class" />)
    expect(container.firstChild).toHaveClass('custom-class')
  })
})
