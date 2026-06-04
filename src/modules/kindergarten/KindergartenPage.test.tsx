import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import KindergartenPage from './KindergartenPage'
import { useKindergartenInvestments } from './useKindergartenInvestments'
import { useKindergartenPacs } from './useKindergartenPacs'
import type { KindergartenInvestment, KindergartenPAC } from '../../types/kindergarten'

vi.mock('./useKindergartenInvestments', () => ({
  useKindergartenInvestments: vi.fn(),
}))

vi.mock('./useKindergartenPacs', () => ({
  useKindergartenPacs: vi.fn(),
}))

const mockInvestment: KindergartenInvestment = {
  id: 'inv-1',
  name: 'Vanguard FTSE All-World',
  ticker: 'VWCE',
  category: 'etf',
  purchaseDate: '2024-01-01',
  purchasePrice: 100,
  quantity: 10,
  currentPrice: 120,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
}

const mockPAC: KindergartenPAC = {
  id: 'pac-1',
  name: 'PAC Futuro',
  monthlyAmount: 200,
  startDate: '2024-01-01',
  targetYears: 18,
  currentValue: 2500,
  totalInvested: 2400,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
}

const defaultInvHook = {
  investments: [mockInvestment],
  kpis: { totalInvested: 1000, currentValue: 1200, gainLoss: 200, gainLossPercent: 20 },
  loading: false,
  error: null,
  addInvestment: vi.fn(),
  updateInvestment: vi.fn(),
  deleteInvestment: vi.fn().mockResolvedValue(undefined),
  refresh: vi.fn(),
}

const defaultPacHook = {
  pacs: [mockPAC],
  kpis: {
    totalPACMonthly: 200,
    totalPACInvested: 2400,
    totalPACValue: 2500,
    pacGainLoss: 100,
    pacGainLossPercent: 4.17,
  },
  loading: false,
  error: null,
  addPAC: vi.fn(),
  updatePAC: vi.fn(),
  deletePAC: vi.fn().mockResolvedValue(undefined),
  refresh: vi.fn(),
}

describe('KindergartenPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // jsdom returns false for window.confirm by default — must mock explicitly
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    vi.mocked(useKindergartenInvestments).mockReturnValue(defaultInvHook)
    vi.mocked(useKindergartenPacs).mockReturnValue(defaultPacHook)
  })

  it('renders loading state', () => {
    vi.mocked(useKindergartenInvestments).mockReturnValue({ ...defaultInvHook, loading: true })
    render(<KindergartenPage uid="test-uid" />)
    expect(document.querySelector('.animate-spin')).toBeTruthy()
  })

  it('renders error state', () => {
    vi.mocked(useKindergartenInvestments).mockReturnValue({
      ...defaultInvHook,
      loading: false,
      error: 'Errore di connessione a Firestore',
    })
    render(<KindergartenPage uid="test-uid" />)
    expect(screen.getByText('Errore di connessione a Firestore')).toBeTruthy()
  })

  it('renders investment and PAC sections', () => {
    render(<KindergartenPage uid="test-uid" />)
    expect(screen.getByText('Investimenti Diretti')).toBeTruthy()
    expect(screen.getByText('Piano di Accumulo (PAC)')).toBeTruthy()
  })

  it('renders investment name in table', () => {
    render(<KindergartenPage uid="test-uid" />)
    expect(screen.getByText('Vanguard FTSE All-World')).toBeTruthy()
  })

  it('renders PAC name in table', () => {
    render(<KindergartenPage uid="test-uid" />)
    expect(screen.getByText('PAC Futuro')).toBeTruthy()
  })

  it('calls deleteInvestment when delete button is clicked and confirmed', async () => {
    render(<KindergartenPage uid="test-uid" />)
    const deleteButtons = screen.getAllByText('Elimina')
    act(() => {
      fireEvent.click(deleteButtons[0])
    })
    await waitFor(() => {
      expect(defaultInvHook.deleteInvestment).toHaveBeenCalledWith('inv-1')
    })
  })
})
