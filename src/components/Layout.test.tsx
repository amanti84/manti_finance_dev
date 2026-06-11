import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { Layout } from './Layout'
import { useAuth } from '../hooks/useAuth'
import type { User } from 'firebase/auth'
import type { InboxBadgeCount } from '../types'

vi.mock('../firebase', () => ({
  auth: {
    signOut: vi.fn(),
  },
  db: {},
}))

vi.mock('firebase/auth', () => ({
  signOut: vi.fn(),
}))

vi.mock('../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../services/alert', () => ({
  getActiveAlerts: vi.fn(() => Promise.resolve({ success: true, data: [] })),
}))

vi.mock('../services/inbox', () => ({
  listInboxItems: vi.fn(() => Promise.resolve({ success: true, data: [] })),
  calculateBadgeCount: vi.fn(() => ({ total: 0, requiresReview: 0, pending: 0 })),
}))

vi.mock('../modules/inbox', () => ({
  InboxBadge: ({ count }: { count: InboxBadgeCount }) => <div data-testid="inbox-badge">{count.total}</div>,
}))

describe('Layout Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useAuth).mockReturnValue({
      user: {
        uid: '123',
        email: 'test@example.com',
        displayName: 'Test User'
      } as unknown as User,
      loading: false,
      signInWithGoogle: vi.fn(),
      logout: vi.fn(),
    })
  })

  const renderLayout = () => {
    return render(
      <BrowserRouter>
        <Layout />
      </BrowserRouter>
    )
  }

  it('renders correctly with sidebar and header', () => {
    renderLayout()
    expect(screen.getByText('Manti')).toBeTruthy()
    expect(screen.getByText('Finance')).toBeTruthy()
    // Find at least one dashboard link (could be sidebar or bottom nav)
    expect(screen.getAllByRole('link', { name: /dashboard/i }).length).toBeGreaterThan(0)
    expect(screen.getByRole('heading', { name: /overview/i })).toBeTruthy()
  })

  it('toggles sidebar expansion on desktop', () => {
    renderLayout()
    // The chevron button is the last one in the aside
    const toggleButton = screen.getAllByRole('button').find(b => b.querySelector('svg.lucide-chevron-left') ?? b.querySelector('svg.lucide-chevron-right'))

    if (!toggleButton) throw new Error('Toggle button not found')

    // Initially expanded (should see "Dashboard" label in the sidebar list)
    expect(screen.getByRole('heading', { name: /overview/i })).toBeTruthy()

    fireEvent.click(toggleButton)

    // After collapse, labels like "Overview" should be hidden (or rather the h3 tag)
    expect(screen.queryByRole('heading', { name: /overview/i })).toBeNull()
  })

  it('toggles dark mode', () => {
    renderLayout()
    const themeButton = screen.getByLabelText('Toggle dark mode')

    fireEvent.click(themeButton)
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')

    fireEvent.click(themeButton)
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
  })

  it('opens and closes user menu', () => {
    renderLayout()
    // Find the user button by its class or content
    const buttons = screen.getAllByRole('button')
    const userButton = buttons.find(b => b.textContent?.trim() === 'T')

    if (!userButton) throw new Error('User button not found')

    fireEvent.click(userButton)
    expect(screen.getByRole('button', { name: /logout/i })).toBeTruthy()
    expect(screen.getByText('test@example.com')).toBeTruthy()

    fireEvent.click(userButton)
    expect(screen.queryByRole('button', { name: /logout/i })).toBeNull()
  })

  it('shows admin link only for admin user', () => {
    const { rerender } = renderLayout()
    expect(screen.queryByRole('link', { name: /admin/i })).toBeNull()

    vi.mocked(useAuth).mockReturnValue({
      user: { uid: 'admin-id', email: 'ant.manti@gmail.com' } as unknown as User,
      loading: false,
      signInWithGoogle: vi.fn(),
      logout: vi.fn(),
    })

    rerender(
      <BrowserRouter>
        <Layout />
      </BrowserRouter>
    )
    expect(screen.getByRole('link', { name: /admin/i })).toBeTruthy()
  })
})
