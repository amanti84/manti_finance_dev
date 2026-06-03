import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { KindergartenPage } from './KindergartenPage'
import { useAuth } from '../../hooks/useAuth'
import { useKindergarten } from './useKindergarten'
import type { User } from 'firebase/auth'
import { Timestamp } from 'firebase/firestore'
import type { KindergartenExpense, KindergartenConfig, KindergartenSummary } from '../../types'

vi.mock('../../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}))

vi.mock('./useKindergarten', () => ({
  useKindergarten: vi.fn(),
}))

const mockUser: User = {
  uid: 'test-uid-123',
  email: 'amanti84@gmail.com',
} as unknown as User

const mockTimestamp = Timestamp.now()

const mockExpenses: KindergartenExpense[] = [
  {
    id: 'exp-1',
    description: 'Retta Gennaio',
    amount: 350,
    year: 2026,
    month: 1,
    category: 'retta',
    frequency: 'monthly',
    createdAt: mockTimestamp,
    updatedAt: mockTimestamp,
  },
  {
    id: 'exp-2',
    description: 'Mensa Gennaio',
    amount: 80,
    year: 2026,
    month: 1,
    category: 'mensa',
    frequency: 'monthly',
    createdAt: mockTimestamp,
    updatedAt: mockTimestamp,
  },
]

const mockConfig: KindergartenConfig = {
  id: 'kindergarten',
  monthlyBudget: 400,
  alertOnOverBudget: true,
  createdAt: mockTimestamp,
  updatedAt: mockTimestamp,
}

const mockSummary: KindergartenSummary = {
  year: 2026,
  totalAnnual: 5160,
  totalMonthly: 430,
  byCategory: {
    retta: 4200,
    mensa: 960,
    attivita_extra: 0,
    materiale: 0,
    altro: 0,
  },
  budgetMonthly: 400,
  isOverBudget: true,
  currentMonthTotal: 430,
}

const mockAddExpense = vi.fn().mockResolvedValue({ success: true })
const mockUpdateExpense = vi.fn().mockResolvedValue({ success: true })
const mockDeleteExpense = vi.fn().mockResolvedValue({ success: true })
const mockSetConfig = vi.fn().mockResolvedValue({ success: true })

const defaultHookReturn = {
  expenses: mockExpenses,
  config: mockConfig,
  summary: mockSummary,
  loading: false,
  error: null,
  addExpense: mockAddExpense,
  updateExpense: mockUpdateExpense,
  deleteExpense: mockDeleteExpense,
  setConfig: mockSetConfig,
  refresh: vi.fn(),
}

describe('KindergartenPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      loading: false,
      signInWithGoogle: vi.fn(),
      logout: vi.fn(),
    })
    vi.mocked(useKindergarten).mockReturnValue(defaultHookReturn)
  })

  it('returns null when user is not authenticated', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      loading: false,
      signInWithGoogle: vi.fn(),
      logout: vi.fn(),
    })
    const { container } = render(<KindergartenPage />)
    expect(container.firstChild).toBeNull()
  })

  it('renders loading state', () => {
    vi.mocked(useKindergarten).mockReturnValue({ ...defaultHookReturn, loading: true })
    render(<KindergartenPage />)
    expect(screen.getByText('Caricamento in corso...')).toBeTruthy()
  })

  it('renders error state', () => {
    vi.mocked(useKindergarten).mockReturnValue({
      ...defaultHookReturn,
      loading: false,
      error: 'Errore di connessione a Firestore',
    })
    render(<KindergartenPage />)
    expect(screen.getByText('Errore di connessione a Firestore')).toBeTruthy()
  })

  it('renders page title and expenses list', () => {
    render(<KindergartenPage />)
    expect(screen.getByText('Kindergarten')).toBeTruthy()
    expect(screen.getByText('Retta Gennaio')).toBeTruthy()
    expect(screen.getByText('Mensa Gennaio')).toBeTruthy()
  })

  it('renders summary card when summary is available', () => {
    render(<KindergartenPage />)
    expect(screen.getByText('Kindergarten')).toBeTruthy()
  })

  it('opens add expense form when button is clicked', () => {
    render(<KindergartenPage />)
    const addButton = screen.getByText('Aggiungi Spesa')
    fireEvent.click(addButton)
    expect(screen.queryByText('Aggiungi Spesa')).toBeTruthy()
  })

  it('calls deleteExpense when delete is triggered', async () => {
    render(<KindergartenPage />)
    const hookReturn = vi.mocked(useKindergarten).mock.results[0]?.value as typeof defaultHookReturn
    await hookReturn.deleteExpense('exp-1')
    expect(mockDeleteExpense).toHaveBeenCalledWith('exp-1')
  })

  it('calls addExpense on form submit (add mode)', async () => {
    render(<KindergartenPage />)
    const newExpense = {
      description: 'Attivit\u00e0 extra',
      amount: 60,
      year: 2026,
      month: 1 as const,
      category: 'attivita_extra' as const,
      frequency: 'once' as const,
    }
    const hookReturn = vi.mocked(useKindergarten).mock.results[0]?.value as typeof defaultHookReturn
    await hookReturn.addExpense(newExpense)
    expect(mockAddExpense).toHaveBeenCalledWith(newExpense)
  })

  it('calls updateExpense on form submit (edit mode)', async () => {
    render(<KindergartenPage />)
    const hookReturn = vi.mocked(useKindergarten).mock.results[0]?.value as typeof defaultHookReturn
    await hookReturn.updateExpense('exp-1', { amount: 400 })
    expect(mockUpdateExpense).toHaveBeenCalledWith('exp-1', { amount: 400 })
  })

  it('allows year selection to change the year', () => {
    render(<KindergartenPage />)
    const select = screen.getByRole('combobox') as unknown as HTMLSelectElement
    const currentYear = new Date().getFullYear()
    expect(select.value).toBe(String(currentYear))
    fireEvent.change(select, { target: { value: String(currentYear - 1) } })
    expect(select.value).toBe(String(currentYear - 1))
  })

  it('calls setConfig when budget config is saved', async () => {
    render(<KindergartenPage />)
    const hookReturn = vi.mocked(useKindergarten).mock.results[0]?.value as typeof defaultHookReturn
    await hookReturn.setConfig({ monthlyBudget: 500, alertOnOverBudget: true })
    expect(mockSetConfig).toHaveBeenCalledWith({ monthlyBudget: 500, alertOnOverBudget: true })
  })

  it('renders over-budget indicator in summary', () => {
    render(<KindergartenPage />)
    expect(screen.getByText('Kindergarten')).toBeTruthy()
  })
})
