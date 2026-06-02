/**
 * KindergartenPage.test.tsx
 * Test suite allineata al rewrite: default export, prop uid,
 * hooks useKindergartenInvestments + useKindergartenPacs.
 * Il vecchio hook useKindergarten (expenses/config/summary) è stato rimosso.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import KindergartenPage from './KindergartenPage'
import { useKindergartenInvestments } from './useKindergartenInvestments'
import { useKindergartenPacs } from './useKindergartenPacs'
import type { KindergartenInvestment, KindergartenPAC, KindergartenKPIs } from '../../types/kindergarten'

vi.mock('./useKindergartenInvestments', () => ({
  useKindergartenInvestments: vi.fn(),
}))

vi.mock('./useKindergartenPacs', () => ({
  useKindergartenPacs: vi.fn(),
}))

vi.mock('./KindergartenInvestmentList', () => ({
  default: ({ investments }: { investments: KindergartenInvestment[] }) => (
    <div data-testid="investment-list">
      {investments.map((inv) => (
        <div key={inv.id} data-testid={`investment-${inv.id}`}>{inv.name}</div>
      ))}
    </div>
  ),
}))

vi.mock('./KindergartenPACList', () => ({
  default: ({ pacs }: { pacs: KindergartenPAC[] }) => (
    <div data-testid="pac-list">
      {pacs.map((pac) => (
        <div key={pac.id} data-testid={`pac-${pac.id}`}>{pac.name}</div>
      ))}
    </div>
  ),
}))

vi.mock('./KindergartenKPICard', () => ({
  default: () => <div data-testid="kpi-card" />,
}))

const mockInvKPIs: Pick<KindergartenKPIs, 'totalInvested' | 'currentValue' | 'gainLoss' | 'gainLossPercent'> = {
  totalInvested: 1000,
  currentValue: 1200,
  gainLoss: 200,
  gainLossPercent: 20,
}

const mockPACKPIs: Pick<KindergartenKPIs, 'totalPACMonthly' | 'totalPACInvested' | 'totalPACValue' | 'pacGainLoss' | 'pacGainLossPercent'> = {
  totalPACMonthly: 100,
  totalPACInvested: 600,
  totalPACValue: 650,
  pacGainLoss: 50,
  pacGainLossPercent: 8.33,
}

const mockInvestments: KindergartenInvestment[] = [
  {
    id: 'inv-1',
    name: 'iShares MSCI World',
    ticker: 'IWDA',
    category: 'etf',
    purchaseDate: '2024-01-15',
    purchasePrice: 80,
    quantity: 10,
    currentPrice: 92,
    createdAt: '2024-01-15T00:00:00Z',
    updatedAt: '2024-01-15T00:00:00Z',
  },
]

const mockPACs: KindergartenPAC[] = [
  {
    id: 'pac-1',
    name: 'PAC Vanguard',
    ticker: 'VWCE',
    monthlyAmount: 100,
    startDate: '2023-06-01',
    targetYears: 18,
    currentValue: 650,
    totalInvested: 600,
    createdAt: '2023-06-01T00:00:00Z',
    updatedAt: '2023-06-01T00:00:00Z',
  },
]

const defaultInvHookReturn = {
  investments: mockInvestments,
  kpis: mockInvKPIs,
  loading: false,
  error: null,
  addInvestment: vi.fn(),
  updateInvestment: vi.fn(),
  deleteInvestment: vi.fn(),
  refresh: vi.fn(),
}

const defaultPACHookReturn = {
  pacs: mockPACs,
  kpis: mockPACKPIs,
  loading: false,
  error: null,
  addPAC: vi.fn(),
  updatePAC: vi.fn(),
  deletePAC: vi.fn(),
  refresh: vi.fn(),
}

const TEST_UID = 'test-uid-123'

describe('KindergartenPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useKindergartenInvestments).mockReturnValue(defaultInvHookReturn)
    vi.mocked(useKindergartenPacs).mockReturnValue(defaultPACHookReturn)
  })

  it('renders loading spinner when investments are loading', () => {
    vi.mocked(useKindergartenInvestments).mockReturnValue({ ...defaultInvHookReturn, loading: true })
    render(<KindergartenPage uid={TEST_UID} />)
    expect(screen.getByRole('status', { hidden: true })).toBeTruthy()
  })

  it('renders loading spinner when PACs are loading', () => {
    vi.mocked(useKindergartenPacs).mockReturnValue({ ...defaultPACHookReturn, loading: true })
    render(<KindergartenPage uid={TEST_UID} />)
    expect(document.querySelector('.animate-spin')).not.toBeNull()
  })

  it('renders error state when investments fail', () => {
    vi.mocked(useKindergartenInvestments).mockReturnValue({
      ...defaultInvHookReturn,
      loading: false,
      error: 'Errore caricamento investimenti',
    })
    render(<KindergartenPage uid={TEST_UID} />)
    expect(screen.getByText('Errore caricamento dati kindergarten')).toBeTruthy()
    expect(screen.getByText('Errore caricamento investimenti')).toBeTruthy()
  })

  it('renders error state when PACs fail', () => {
    vi.mocked(useKindergartenPacs).mockReturnValue({
      ...defaultPACHookReturn,
      loading: false,
      error: 'Errore caricamento PAC',
    })
    render(<KindergartenPage uid={TEST_UID} />)
    expect(screen.getByText('Errore caricamento PAC')).toBeTruthy()
  })

  it('renders KPI card, investment list and PAC list', () => {
    render(<KindergartenPage uid={TEST_UID} />)
    expect(screen.getByTestId('kpi-card')).toBeTruthy()
    expect(screen.getByTestId('investment-list')).toBeTruthy()
    expect(screen.getByTestId('pac-list')).toBeTruthy()
  })

  it('renders investment items inside the list', () => {
    render(<KindergartenPage uid={TEST_UID} />)
    expect(screen.getByText('iShares MSCI World')).toBeTruthy()
  })

  it('renders PAC items inside the list', () => {
    render(<KindergartenPage uid={TEST_UID} />)
    expect(screen.getByText('PAC Vanguard')).toBeTruthy()
  })

  it('renders section headings', () => {
    render(<KindergartenPage uid={TEST_UID} />)
    expect(screen.getByText('Investimenti Diretti')).toBeTruthy()
    expect(screen.getByText('Piano di Accumulo (PAC)')).toBeTruthy()
  })

  it('passes correct uid to both hooks', () => {
    render(<KindergartenPage uid={TEST_UID} />)
    expect(vi.mocked(useKindergartenInvestments)).toHaveBeenCalledWith(TEST_UID)
    expect(vi.mocked(useKindergartenPacs)).toHaveBeenCalledWith(TEST_UID)
  })
})
