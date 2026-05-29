import { describe, it, expect, vi, beforeEach } from 'vitest'
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

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    Navigate: ({ to }: { to: string }) => <div data-testid="navigate" data-to={to}>Redirected to {to}</div>,
  }
})

interface MockSeedResult {
  data: {
    success: boolean
    data: { inserted: number; skipped: number }
  }
}

function mockUser(email: string): User {
  return { email } as unknown as User
}

describe('AdminPage', () => {
  beforeEach(() => { vi.clearAllMocks() })

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
      user: mockUser('hacker@gmail.com'),
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
      user: mockUser('amanti84@gmail.com'),
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
    } satisfies MockSeedResult)
    vi.mocked(httpsCallable).mockReturnValue(mockCallable as unknown as HttpsCallable<Record<string, never>, { success: boolean; data: { inserted: number; skipped: number } }>)

    vi.mocked(useAuth).mockReturnValue({
      user: mockUser('amanti84@gmail.com'),
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
      expect(screen.getByText('Saltati: 0')).toBeTruthy()
    })
  })

  it('shows error message on failure', async () => {
    const mockCallable = vi.fn().mockRejectedValue(new Error('API Error'))
    vi.mocked(httpsCallable).mockReturnValue(mockCallable as unknown as HttpsCallable<Record<string, never>, { success: boolean; data: { inserted: number; skipped: number } }>)

    vi.mocked(useAuth).mockReturnValue({
      user: mockUser('amanti84@gmail.com'),
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
