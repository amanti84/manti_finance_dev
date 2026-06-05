import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Input } from './Input'

describe('Input Component', () => {
  it('renders correctly with label', () => {
    render(<Input label="Username" />)
    expect(screen.getByLabelText('Username')).toBeTruthy()
  })

  it('handles change events', () => {
    const handleChange = vi.fn()
    render(<Input label="Username" onChange={handleChange} />)
    const input = screen.getByLabelText('Username')
    fireEvent.change(input, { target: { value: 'test' } })
    expect(handleChange).toHaveBeenCalledTimes(1)
  })

  it('shows error message and applies error styles', () => {
    render(<Input label="Username" error="Invalid username" />)
    expect(screen.getByText(/invalid username/i)).toBeTruthy()
    const input = screen.getByLabelText('Username')
    expect(input.className).toContain('border-error')
  })

  it('shows helper text when no error is present', () => {
    render(<Input label="Username" helperText="Enter your email" />)
    expect(screen.getByText(/enter your email/i)).toBeTruthy()
  })

  it('renders icons correctly', () => {
    render(
      <Input
        label="Search"
        leftIcon={<span data-testid="left-icon">L</span>}
        rightIcon={<span data-testid="right-icon">R</span>}
      />
    )
    expect(screen.getByTestId('left-icon')).toBeTruthy()
    expect(screen.getByTestId('right-icon')).toBeTruthy()
    const input = screen.getByLabelText('Search')
    expect(input.className).toContain('pl-10')
    expect(input.className).toContain('pr-10')
  })

  it('is disabled when disabled prop is true', () => {
    render(<Input label="Disabled" disabled />)
    const input = screen.getByLabelText('Disabled')
    expect(input.hasAttribute('disabled')).toBe(true)
  })
})
