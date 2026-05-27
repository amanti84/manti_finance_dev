import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from './App'

vi.mock('./hooks/useAuth', () => ({
  useAuth: () => ({ user: null, loading: false }),
}))

describe('App', () => {
  it('renders without crashing', () => {
    const { container } = render(<App />)
    expect(container).toBeTruthy()
  })

  it('shows login message when not authenticated', () => {
    render(<App />)
    expect(screen.getByText('Effettua il login per accedere')).toBeTruthy()
  })
})
