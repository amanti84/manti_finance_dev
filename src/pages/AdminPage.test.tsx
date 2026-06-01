import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AdminPage } from './AdminPage'
import { useAuth } from '../hooks/useAuth'
import { MemoryRouter } from 'react-router-dom'
import type { User } from 'firebase/auth'

// Mocks
vi.mock('../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}))

vi.mock('firebase/functions', () => ({
  getFunctions: vi.fn(),
  httpsCallable: vi.fn(),
}))

// Mock Navigate to avoid real redirects in tests
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    Navigate: ({ to }: { to: string }) => <div data-testid="navigate" data-to={to}>Redirected to {to}</div>,
  }
})

describe('AdminPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('VITE_ALLOWED_EMAILS', 'amanti84@gmail.com')
  })

  it('renders loading state', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      loading: true,
      signInWithGoogle: vi.fn(),
      logout: vi.fn(),
    })
    render(<MemoryRouter><AdminPage /></MemoryRouter>)
    expect(screen.getByText('Caricamento...')).toBeTruthy()
  })

  it('redirects to / if user is not authorized', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { email: 'hacker@gmail.com' } as unknown as User,
      loading: false,
      signInWithGoogle: vi.fn(),
      logout: vi.fn(),
    })
    render(<MemoryRouter><AdminPage /></MemoryRouter>)
    expect(screen.getByTestId('navigate')).toBeTruthy()
    expect(screen.getByTestId('navigate').getAttribute('data-to')).toBe('/')
  })

  it('renders correctly for authorized admin', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { email: 'amanti84@gmail.com' } as unknown as User,
      loading: false,
      signInWithGoogle: vi.fn(),
      logout: vi.fn(),
    })
    render(<MemoryRouter><AdminPage /></MemoryRouter>)
    expect(screen.getByText('Pannello Amministrazione')).toBeTruthy()
    expect(screen.getByText('Carica dati seed')).toBeTruthy()
  })
})
