import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { User } from 'firebase/auth'
import { useAuth } from './hooks/useAuth'

vi.mock('./firebase', () => ({
  db: {},
  auth: {
    currentUser: null,
    onAuthStateChanged: vi.fn(() => vi.fn()),
  },
  storage: {},
  default: {},
}))

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(),
  onAuthStateChanged: vi.fn(() => vi.fn()),
  signInWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
}))

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(),
  collection: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(() => Promise.resolve({ docs: [], empty: true })),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  addDoc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  Timestamp: { now: vi.fn(() => ({ seconds: 0, nanoseconds: 0 })), fromDate: vi.fn() },
}))

vi.mock('firebase/storage', () => ({
  getStorage: vi.fn(),
}))

vi.mock('./hooks/useAuth', () => ({
  useAuth: vi.fn(),
}))

// Mock components to avoid deep rendering issues in App tests
vi.mock('./modules/payroll', () => ({
  PayrollPage: () => <div>Payroll Page</div>,
}))
vi.mock('./modules/pac', () => ({
  PacPage: () => <div>PAC Page</div>,
}))
vi.mock('./modules/cashflow', () => ({
  CashFlowPage: () => <div>Cash Flow Page</div>,
}))

import App from './App'

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing and shows login when not authenticated', () => {
    vi.mocked(useAuth).mockReturnValue({ user: null, loading: false })
    render(<App />)
    expect(screen.getByText('Login')).toBeTruthy()
  })

  it('renders dashboard when authenticated', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { uid: '123', email: 'test@example.com' } as unknown as User,
      loading: false,
    })
    render(<App />)
    // Check for "Dashboard" in heading or link
    expect(screen.getAllByText('Dashboard').length).toBeGreaterThan(0)
    expect(screen.getByText(/Benvenuto, test@example.com/)).toBeTruthy()
  })

  it('shows loading state', () => {
    vi.mocked(useAuth).mockReturnValue({ user: null, loading: true })
    render(<App />)
    expect(screen.getByText('Caricamento...')).toBeTruthy()
  })
})
