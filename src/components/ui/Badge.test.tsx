import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Badge } from './Badge'

describe('Badge Component', () => {
  it('renders correctly with children', () => {
    render(<Badge>Status</Badge>)
    expect(screen.getByText('Status')).toBeTruthy()
  })

  it('applies correct variant classes', () => {
    const { rerender } = render(<Badge variant="success">Success</Badge>)
    expect(screen.getByText('Success').className).toContain('text-success')

    rerender(<Badge variant="error">Error</Badge>)
    expect(screen.getByText('Error').className).toContain('text-error')
  })

  it('applies correct size classes', () => {
    const { rerender } = render(<Badge size="sm">Small</Badge>)
    expect(screen.getByText('Small').className).toContain('text-[10px]')

    rerender(<Badge size="md">Medium</Badge>)
    expect(screen.getByText('Medium').className).toContain('text-xs')
  })
})
