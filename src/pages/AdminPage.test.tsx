import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AdminPage } from './AdminPage'
import { useAuth } from '../hooks/useAuth'
import { MemoryRouter } from 'react-router-dom'
import { httpsCallable } from 'firebase/functions'
import type { User } from 'firebase/auth'
import type { HttpsCallable } from 'firebase/functions'

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

interface SeedResponse {
  success: boolean
  data: { inserted: number; skipped: number }
}

// Imposta VITE_ALLOWED_EMAILS per i test, in modo che il guard
// di AdminPage funzioni correttamente in CI senza dipendere da secrets
beforeAll(() => {
  import.meta.env.VITE_ALLOWED_EMAILS = 'amanti84@gmail.com'
})

describe('AdminPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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

  it('calls seedUserData function and shows success message', async () => {
    const mockCallable = vi.fn().mockResolvedValue({
      data: { success: true, data: { inserted: 5, skipped: 0 } },
    })
    vi.mocked(httpsCallable).mockReturnValue(mockCallable as unknown as HttpsCallable)
    vi.mocked(useAuth).mockReturnValue({
      user: { email: 'amanti84@gmail.com' } as unknown as User,
      loading: false,
      signInWithGoogle: vi.fn(),
      logout: vi.fn(),
    })
    render(<MemoryRouter><AdminPage /></MemoryRouter>)
    const button = screen.getByText('Carica dati seed')
    fireEvent.click(button)
    expect(button.textContent).toBe('Caricamento in corso...')
    await waitFor(() => {
      expect(screen.getByText('Dati caricati correttamente:')).toBeTruthy()
      expect(screen.getByText('Inseriti: 5')).toBeTruthy()
      expect(screen.getByText('Saltati (duplicati): 0')).toBeTruthy()
    })
  })

  it('shows error message on failure', async () => {
    vi.mocked(httpsCallable).mockReturnValue(
      vi.fn().mockRejectedValue(new Error('API Error')) as unknown as HttpsCallable
    )
    vi.mocked(useAuth).mockReturnValue({
      user: { email: 'amanti84@gmail.com' } as unknown as User,
      loading: false,
      signInWithGoogle: vi.fn(),
      logout: vi.fn(),
    })
    render(<MemoryRouter><AdminPage /></MemoryRouter>)
    fireEvent.click(screen.getByText('Carica dati seed'))
    await waitFor(() => {
      expect(screen.getByText('API Error')).toBeTruthy()
    })
  })
})
