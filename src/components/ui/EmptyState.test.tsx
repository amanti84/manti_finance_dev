import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { EmptyState } from './EmptyState'

describe('EmptyState Component', () => {
  it('renders correctly with title and description', () => {
    render(
      <EmptyState
        title="No items found"
        description="Try adjusting your filters"
      />
    )
    expect(screen.getByText('No items found')).toBeTruthy()
    expect(screen.getByText('Try adjusting your filters')).toBeTruthy()
  })

  it('renders icon when provided', () => {
    render(
      <EmptyState
        title="Empty"
        icon={<span data-testid="test-icon">ICON</span>}
      />
    )
    expect(screen.getByTestId('test-icon')).toBeTruthy()
  })

  it('renders action button and handles click', () => {
    const handleClick = vi.fn()
    render(
      <EmptyState
        title="Empty"
        action={{ label: 'Add Item', onClick: handleClick }}
      />
    )
    const button = screen.getByText('Add Item')
    fireEvent.click(button)
    expect(handleClick).toHaveBeenCalledTimes(1)
  })
})
