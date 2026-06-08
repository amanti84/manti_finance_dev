import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { LoginPage } from './LoginPage'
import * as authHook from '../hooks/useAuth'
import { BrowserRouter } from 'react-router-dom'

// Mock Firebase
vi.mock('../firebase', () => ({
  auth: {},
  googleProvider: {},
  db: {},
}))

// Mock useAuth hook
vi.mock('../hooks/useAuth')

const renderWithRouter = (ui: React.ReactElement) => {
  return render(ui, { wrapper: BrowserRouter })
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders correctly', () => {
    vi.mocked(authHook.useAuth).mockReturnValue({
      user: null,
      loading: false,
      signInWithGoogle: vi.fn(),
      logout: vi.fn(),
    })

    renderWithRouter(<LoginPage />)

    expect(screen.getByText('Manti Finance')).toBeDefined()
    expect(screen.getByText('La tua finanza personale, sotto controllo.')).toBeDefined()
    expect(screen.getByRole('button', { name: /Accedi con Google/i })).toBeDefined()
    expect(screen.getByText(/Accesso riservato/i)).toBeDefined()
  })

  it('shows loading state when auth is loading', () => {
    vi.mocked(authHook.useAuth).mockReturnValue({
      user: null,
      loading: true,
      signInWithGoogle: vi.fn(),
      logout: vi.fn(),
    })

    renderWithRouter(<LoginPage />)

    expect(screen.getByText('Caricamento in corso...')).toBeDefined()
  })

  it('calls signInWithGoogle when button is clicked', async () => {
    const signInWithGoogle = vi.fn().mockResolvedValue({ success: true })
    vi.mocked(authHook.useAuth).mockReturnValue({
      user: null,
      loading: false,
      signInWithGoogle,
      logout: vi.fn(),
    })

    renderWithRouter(<LoginPage />)

    const button = screen.getByRole('button', { name: /Accedi con Google/i })
    fireEvent.click(button)

    await waitFor(() => {
      expect(signInWithGoogle).toHaveBeenCalledTimes(1)
    })
  })

  it('shows error message on unauthorized account', async () => {
    const signInWithGoogle = vi.fn().mockResolvedValue({ success: false, error: 'unauthorized' })
    vi.mocked(authHook.useAuth).mockReturnValue({
      user: null,
      loading: false,
      signInWithGoogle,
      logout: vi.fn(),
    })

    renderWithRouter(<LoginPage />)

    const button = screen.getByRole('button', { name: /Accedi con Google/i })
    fireEvent.click(button)

    await waitFor(() => {
      expect(screen.getByText('Account non autorizzato. Contatta l’amministratore.')).toBeDefined()
    })
  })

  it('shows generic error message on other errors', async () => {
    const signInWithGoogle = vi.fn().mockResolvedValue({ success: false, error: 'some other error' })
    vi.mocked(authHook.useAuth).mockReturnValue({
      user: null,
      loading: false,
      signInWithGoogle,
      logout: vi.fn(),
    })

    renderWithRouter(<LoginPage />)

    const button = screen.getByRole('button', { name: /Accedi con Google/i })
    fireEvent.click(button)

    await waitFor(() => {
      expect(screen.getByText('Accesso non riuscito. Riprova.')).toBeDefined()
    })
  })

  it('redirects when user is logged in', () => {
    vi.mocked(authHook.useAuth).mockReturnValue({
      user: { uid: '123' } as unknown as authHook.UseAuthReturn['user'],
      loading: false,
      signInWithGoogle: vi.fn(),
      logout: vi.fn(),
    })

    renderWithRouter(<LoginPage />)

    // In a real app, Navigate would change the location.
    // Here we just check that the login page content is NOT rendered.
    expect(screen.queryByText('Manti Finance')).toBeNull()
  })
})
