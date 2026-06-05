import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ComponentGallery } from './ComponentGallery'

describe('ComponentGallery', () => {
  it('renders all sections', () => {
    render(<ComponentGallery />)
    expect(screen.getByRole('heading', { name: 'Buttons' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Badges' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Cards' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Inputs' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Modal' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Empty State' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Skeletons' })).toBeTruthy()
  })

  it('opens modal when clicking button', () => {
    render(<ComponentGallery />)
    const button = screen.getByRole('button', { name: 'Open Modal' })
    fireEvent.click(button)
    expect(screen.getByRole('heading', { name: 'Confirm Action' })).toBeTruthy()
  })
})
