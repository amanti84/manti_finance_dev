import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AdminPage } from './AdminPage'
import { useAuth } from '../hooks/useAuth'
import { MemoryRouter } from 'react-router-dom'
import type { User } from 'firebase/auth'
import type * as ReactRouterDom from 'react-router-dom'

// Mocks
vi.mock('../hooks/useAuth', () => ({
  useAuth: vi.fn()
}))

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof ReactRouterDom>('react-router-dom')
  return {
    ...actual,
    Navigate: vi.fn(({ to }: { to: string }) => <div data-testid="navigate" data-to={to} />)
  }
})

type MockAuthReturn = {
  user: User | null
  loading: boolean
  signInWithGoogle: () => Promise<{ success: boolean; error?: string; }>
  logout: () => Promise<void>
}

describe('AdminPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('VITE_ALLOWED_EMAILS', 'amanti84@gmail.com')
  })

  it('renders loading state', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      loading: true,
      signInWithGoogle: vi.fn() as unknown as () => Promise<{ success: boolean; error?: string; }>,
      logout: vi.fn() as unknown as () => Promise<void>,
    } satisfies MockAuthReturn)
    render(<MemoryRouter><AdminPage /></MemoryRouter>)
    expect(screen.getByText('Caricamento...')).toBeTruthy()
  })

  it('redirects if user is not admin', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { email: 'not-admin@gmail.com' } as unknown as User,
      loading: false,
      signInWithGoogle: vi.fn() as unknown as () => Promise<{ success: boolean; error?: string; }>,
      logout: vi.fn() as unknown as () => Promise<void>,
    } satisfies MockAuthReturn)
    render(<MemoryRouter><AdminPage /></MemoryRouter>)
    expect(screen.getByTestId('navigate')).toBeTruthy()
    expect(screen.getByTestId('navigate').getAttribute('data-to')).toBe('/')
  })

  it('renders admin panel if user is admin', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        email: 'amanti84@gmail.com'
      } as unknown as User,
      loading: false,
      signInWithGoogle: vi.fn() as unknown as () => Promise<{ success: boolean; error?: string; }>,
      logout: vi.fn() as unknown as () => Promise<void>,
    } satisfies MockAuthReturn)
    render(<MemoryRouter><AdminPage /></MemoryRouter>)

    expect(screen.queryByTestId('navigate')).toBeNull()
    expect(screen.getByText('Pannello Amministrazione')).toBeTruthy()
    expect(screen.getByText('Carica dati seed')).toBeTruthy()
  })

  it('calls seedUserData function via fetch and shows success message', async () => {
    const mockUser: User = {
      email: 'amanti84@gmail.com',
      getIdToken: vi.fn().mockResolvedValue('mock-token'),
    } as unknown as User

    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      loading: false,
      signInWithGoogle: vi.fn() as unknown as () => Promise<{ success: boolean; error?: string; }>,
      logout: vi.fn() as unknown as () => Promise<void>,
    } satisfies MockAuthReturn)

    mockFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        success: true,
        data: { inserted: 5, skipped: 0 }
      })
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

    expect(mockFetch).toHaveBeenCalledWith(
      'https://us-central1-mantifinance.cloudfunctions.net/seeduserdata',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Authorization': 'Bearer mock-token',
          'Content-Type': 'application/json'
        }
      })
    )
  })

  it('shows error message on fetch failure', async () => {
    const mockUser: User = {
      email: 'amanti84@gmail.com',
      getIdToken: vi.fn().mockResolvedValue('mock-token'),
    } as unknown as User

    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      loading: false,
      signInWithGoogle: vi.fn() as unknown as () => Promise<{ success: boolean; error?: string; }>,
      logout: vi.fn() as unknown as () => Promise<void>,
    } satisfies MockAuthReturn)

    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: vi.fn().mockResolvedValue({
        success: false,
        error: 'API Error'
      })
    })

    render(<MemoryRouter><AdminPage /></MemoryRouter>)
    fireEvent.click(screen.getByText('Carica dati seed'))

    await waitFor(() => {
      expect(screen.getByText('API Error')).toBeTruthy()
    })
  })
})
