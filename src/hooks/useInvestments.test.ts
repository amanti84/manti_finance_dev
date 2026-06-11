/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Firebase per evitare inizializzazione con chiavi vuote in CI
vi.mock('../firebase', () => ({
  db: {},
  auth: {},
  storage: {},
  default: {},
}))

import { renderHook, waitFor } from '@testing-library/react'
import { useInvestments } from './useInvestments'
import * as investmentService from '../services/investment'
import * as authHook from './useAuth'
import type { UseAuthReturn } from './useAuth'
import type { Investment } from '../types'

vi.mock('../services/investment')
vi.mock('./useAuth')

describe('useInvestments', () => {
  const mockUser = { uid: 'user123' }
  const mockInvestments = [
    {
      id: 'inv1',
      name: 'Vanguard S&P 500',
      quantity: 10,
      avgCost: 400,
      currentPrice: 450,
      currentValue: 4500,
      currency: 'EUR' as const,
      assetClass: 'etf' as const,
      broker: 'fineco' as const,
      isPac: true,
      lastPriceUpdate: { toMillis: () => Date.now() }
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(authHook.useAuth).mockReturnValue({ user: mockUser } as unknown as UseAuthReturn)
  })

  it('should fetch investments on mount', async () => {
    vi.mocked(investmentService.getAllInvestments).mockResolvedValue({
      success: true,
      data: mockInvestments as unknown as Investment[]
    })

    vi.mocked(investmentService.getPortfolioSummary).mockReturnValue({
      success: true,
      data: {
        totalValue: 4500,
        totalCostBasis: 4000,
        totalPnL: 500,
        totalPnLPct: 12.5,
        investmentCount: 1,
        lastUpdate: { seconds: 0, nanoseconds: 0 } as any
      }
    })

    const { result } = renderHook(() => useInvestments())

    expect(result.current.loading).toBe(true)

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.investments).toEqual(mockInvestments)
    expect(investmentService.getAllInvestments).toHaveBeenCalledWith('user123')
  })

  it('should handle fetch errors', async () => {
    vi.mocked(investmentService.getAllInvestments).mockResolvedValue({
      success: false,
      error: 'Fetch failed'
    })

    const { result } = renderHook(() => useInvestments())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    }, { timeout: 15000 }) // increased timeout for retries

    expect(result.current.error).toContain('Fetch failed')
    expect(result.current.investments).toEqual([])
  })

  it('should call createInvestment and refresh', async () => {
    vi.mocked(investmentService.getAllInvestments).mockResolvedValue({
      success: true,
      data: []
    })
    vi.mocked(investmentService.createInvestment).mockResolvedValue({
      success: true,
      data: 'new-id'
    })

    const { result } = renderHook(() => useInvestments())

    await result.current.addInvestment({ name: 'New' } as unknown as Omit<Investment, 'id' | 'createdAt' | 'updatedAt' | 'currentValue'>)

    expect(investmentService.createInvestment).toHaveBeenCalledWith('user123', { name: 'New' })
    expect(investmentService.getAllInvestments).toHaveBeenCalledTimes(2)
  })

  it('should call deleteInvestment and refresh', async () => {
    vi.mocked(investmentService.getAllInvestments).mockResolvedValue({
      success: true,
      data: mockInvestments as unknown as Investment[]
    })
    vi.mocked(investmentService.deleteInvestment).mockResolvedValue({
      success: true,
      data: undefined
    })

    const { result } = renderHook(() => useInvestments())

    await result.current.removeInvestment('inv1')

    expect(investmentService.deleteInvestment).toHaveBeenCalledWith('user123', 'inv1')
    expect(investmentService.getAllInvestments).toHaveBeenCalledTimes(2)
  })
})
/* eslint-enable @typescript-eslint/no-explicit-any */
