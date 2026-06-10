import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Firebase per evitare inizializzazione con chiavi vuote in CI
vi.mock('../../firebase', () => ({
  db: {},
  auth: {
    onAuthStateChanged: vi.fn(() => vi.fn()),
  },
  storage: {},
  default: {},
}))

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { uid: 'test-uid' },
    loading: false,
    signInWithGoogle: vi.fn(),
    logout: vi.fn(),
  }),
}))

import { render, screen, fireEvent } from '@testing-library/react'
import { InvestimentiPage } from './InvestimentiPage'
import * as useInvestmentsHook from '../../hooks/useInvestments'
import type { UseInvestmentsReturn } from '../../hooks/useInvestments'

vi.mock('../../hooks/useInvestments')

describe('InvestimentiPage', () => {
  const mockInvestments = [
    {
      id: 'inv1',
      name: 'Vanguard S&P 500',
      quantity: 10,
      avgCost: 400,
      currentPrice: 450,
      currentValue: 4500,
      currency: 'EUR',
      assetClass: 'etf',
      broker: 'fineco',
      isPac: true,
      lastPriceUpdate: { toMillis: () => Date.now(), toDate: () => new Date() }
    }
  ]

  const mockSummary = {
    totalValue: 4500,
    totalCostBasis: 4000,
    totalPnL: 500,
    totalPnLPct: 12.5,
    investmentCount: 1,
    lastUpdate: { toMillis: () => Date.now() }
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useInvestmentsHook.useInvestments).mockReturnValue({
      investments: mockInvestments,
      loading: false,
      error: null,
      summary: mockSummary,
      addInvestment: vi.fn(),
      editInvestment: vi.fn(),
      removeInvestment: vi.fn(),
      refresh: vi.fn(),
    } as unknown as UseInvestmentsReturn)
  })

  it('should render KPIs and table correctly', () => {
    render(<InvestimentiPage />)

    expect(screen.getByText('Valore Portafoglio')).toBeDefined()
    // Using a more flexible text matcher for values
    expect(screen.getAllByText((content) => content.includes('4500,00'))).toBeDefined()
    expect(screen.getByText('Vanguard S&P 500')).toBeDefined()
    expect(screen.getAllByText('fineco')).toBeDefined()
  })

  it('should show empty state when no investments', () => {
    vi.mocked(useInvestmentsHook.useInvestments).mockReturnValue({
      investments: [],
      loading: false,
      error: null,
      summary: null,
      addInvestment: vi.fn(),
      editInvestment: vi.fn(),
      removeInvestment: vi.fn(),
      refresh: vi.fn(),
    })

    render(<InvestimentiPage />)

    expect(screen.getByText('Il tuo portafoglio è vuoto')).toBeDefined()
    expect(screen.getAllByText('Aggiungi Investimento')).toBeDefined()
  })

  it('should open add modal when clicking add button', () => {
    render(<InvestimentiPage />)

    const addButton = screen.getByRole('button', { name: /Aggiungi Investimento/i })
    fireEvent.click(addButton)

    expect(screen.getByRole('heading', { name: /Aggiungi Investimento/i })).toBeDefined()
  })

  it('should open detail modal when clicking table row', () => {
    render(<InvestimentiPage />)

    const row = screen.getByText('Vanguard S&P 500')
    fireEvent.click(row)

    expect(screen.getByRole('heading', { name: /Dettaglio Investimento/i })).toBeDefined()
    expect(screen.getAllByText((content) => content.includes('450,00'))).toBeDefined()
  })

  it('should filter investments by name', () => {
    render(<InvestimentiPage />)

    const searchInput = screen.getByPlaceholderText('Nome, ISIN, Ticker...')
    fireEvent.change(searchInput, { target: { value: 'Non-existent' } })

    expect(screen.queryByText('Vanguard S&P 500')).toBeNull()
    expect(screen.getByText('Nessun investimento trovato')).toBeDefined()
  })
})
