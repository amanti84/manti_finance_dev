import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ComponentGallery } from './ComponentGallery'

describe('ComponentGallery', () => {
  it('renders all sections', () => {
    render(<ComponentGallery />)
    expect(screen.getByText('Buttons')).toBeTruthy()
    expect(screen.getByText('Badges')).toBeTruthy()
    expect(screen.getByText('Cards')).toBeTruthy()
    expect(screen.getByText('Inputs')).toBeTruthy()
    expect(screen.getByText('Modal')).toBeTruthy()
    expect(screen.getByText('Empty State')).toBeTruthy()
    expect(screen.getByText('Skeletons')).toBeTruthy()
  })

  it('opens modal when clicking button', () => {
    render(<ComponentGallery />)
    const button = screen.getByRole('button', { name: 'Open Modal' })
    fireEvent.click(button)
    expect(screen.getByText('Confirm Action')).toBeTruthy()
  })
})
