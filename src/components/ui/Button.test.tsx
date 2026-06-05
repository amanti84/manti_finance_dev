import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from './Button'

describe('Button Component', () => {
  it('renders correctly with children', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button', { name: /click me/i })).toBeTruthy()
  })

  it('handles click events', () => {
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>Click me</Button>)
    fireEvent.click(screen.getByRole('button', { name: /click me/i }))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Click me</Button>)
    const button = screen.getByRole('button')
    expect(button.hasAttribute('disabled')).toBe(true)
  })

  it('shows loading spinner and is disabled when isLoading is true', () => {
    render(<Button isLoading>Click me</Button>)
    const button = screen.getByRole('button')
    expect(button.hasAttribute('disabled')).toBe(true)
    // Lucide Loader2 has animate-spin class
    expect(button.querySelector('.animate-spin')).toBeTruthy()
  })

  it('renders icons correctly', () => {
    render(
      <Button
        leftIcon={<span data-testid="left-icon">L</span>}
        rightIcon={<span data-testid="right-icon">R</span>}
      >
        Click
      </Button>
    )
    expect(screen.getByTestId('left-icon')).toBeTruthy()
    expect(screen.getByTestId('right-icon')).toBeTruthy()
  })

  it('applies correct variant classes', () => {
    const { rerender } = render(<Button variant="danger">Danger</Button>)
    expect(screen.getByRole('button').className).toContain('bg-error')

    rerender(<Button variant="ghost">Ghost</Button>)
    expect(screen.getByRole('button').className).toContain('bg-transparent')
  })
})
