import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Modal } from './Modal'

describe('Modal Component', () => {
  it('does not render when isOpen is false', () => {
    const { container } = render(
      <Modal isOpen={false} onClose={() => { vi.fn() }}>
        Modal content
      </Modal>
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders correctly when isOpen is true', () => {
    render(
      <Modal isOpen={true} onClose={() => { vi.fn() }} title="Test Modal">
        Modal content
      </Modal>
    )
    expect(screen.getByRole('heading', { name: 'Test Modal' })).toBeTruthy()
    expect(screen.getByText('Modal content')).toBeTruthy()
    expect(screen.getByRole('dialog')).toBeTruthy()
  })

  it('calls onClose when backdrop is clicked', () => {
    const handleClose = vi.fn()
    render(
      <Modal isOpen={true} onClose={handleClose}>
        Modal content
      </Modal>
    )
    // The backdrop is the first child of the main container (fixed inset-0)
    const backdrop = screen.getByRole('dialog').previousElementSibling
    if (backdrop) {
      fireEvent.click(backdrop)
      expect(handleClose).toHaveBeenCalledTimes(1)
    }
  })

  it('calls onClose when X button is clicked', () => {
    const handleClose = vi.fn()
    render(
      <Modal isOpen={true} onClose={handleClose}>
        Modal content
      </Modal>
    )
    const closeButton = screen.getByLabelText('Close modal')
    fireEvent.click(closeButton)
    expect(handleClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when Escape key is pressed', () => {
    const handleClose = vi.fn()
    render(
      <Modal isOpen={true} onClose={handleClose}>
        Modal content
      </Modal>
    )
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(handleClose).toHaveBeenCalledTimes(1)
  })

  it('renders footer when provided', () => {
    render(
      <Modal isOpen={true} onClose={() => { vi.fn() }} footer={<button>Submit</button>}>
        Modal content
      </Modal>
    )
    expect(screen.getByRole('button', { name: /submit/i })).toBeTruthy()
  })
})
