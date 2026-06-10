import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  updateInvestmentPrice,
  updateKindergartenInvestmentPrice,
  updateKindergartenPACPrice,
  updateAllKindergartenPrices
} from './priceUpdate'
import { getPriceByISIN } from './isin'
import { updateInvestment } from './investment'
import {
  getKindergartenInvestments,
  updateKindergartenInvestment
} from './kindergartenInvestment'
import {
  getKindergartenPACs,
  updateKindergartenPAC
} from './kindergartenPac'
import { logAudit } from './audit'
import { Timestamp } from 'firebase/firestore'
import { type Investment, type ApiResult, type PriceData } from '../types'
import { type KindergartenInvestment, type KindergartenPAC } from '../types/kindergarten'

// Mock services
vi.mock('./isin')
vi.mock('./investment')
vi.mock('./kindergartenInvestment')
vi.mock('./kindergartenPac')
vi.mock('./audit')
vi.mock('../firebase', () => ({
  db: {}
}))

describe('Price Update Service', () => {
  const uid = 'test-uid'
  const mockInvestment: Investment = {
    id: 'inv-1',
    name: 'Test ETF',
    isin: 'IE00B1234567',
    ticker: 'TEST.MI',
    assetClass: 'etf',
    broker: 'fineco',
    quantity: 10,
    avgCost: 100,
    currentPrice: 100,
    currentValue: 1000,
    currency: 'EUR',
    isPac: false,
    lastPriceUpdate: Timestamp.now(),
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    autoUpdate: true
  }

  const mockKGInvestment: KindergartenInvestment = {
    id: 'kg-inv-1',
    name: 'KG ETF',
    isin: 'IE00B1234567',
    ticker: 'TEST.MI',
    category: 'etf',
    quantity: 10,
    purchasePrice: 100,
    currentPrice: 100,
    purchaseDate: '2023-01-01',
    createdAt: '2023-01-01',
    updatedAt: '2023-01-01',
    autoUpdate: true
  }

  const mockKGPAC: KindergartenPAC = {
    id: 'kg-pac-1',
    name: 'KG PAC',
    isin: 'IE00B7890123',
    ticker: 'PAC.MI',
    monthlyAmount: 100,
    quantity: 50,
    startDate: '2023-01-01',
    targetYears: 18,
    currentValue: 5000,
    totalInvested: 4800,
    createdAt: '2023-01-01',
    updatedAt: '2023-01-01',
    autoUpdate: true
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  describe('updateInvestmentPrice', () => {
    it('should update price successfully (happy path)', async () => {
      vi.mocked(getPriceByISIN).mockResolvedValueOnce({
        success: true,
        data: {
          isin: 'IE00B1234567',
          ticker: 'TEST.MI',
          name: 'Test ETF',
          price: 110,
          currency: 'EUR',
          currentValue: 1100,
          timestamp: new Date().toISOString(),
          source: 'Yahoo Finance'
        }
      })

      vi.mocked(updateInvestment).mockResolvedValueOnce({ success: true, data: undefined })

      const result = await updateInvestmentPrice(uid, mockInvestment)

      expect(result.success).toBe(true)
      expect(updateInvestment).toHaveBeenCalledWith(uid, 'inv-1', expect.objectContaining({
        currentPrice: 110,
        currentValue: 1100,
        priceSource: 'Yahoo Finance',
        lastUpdateError: null
      }))
      expect(logAudit).toHaveBeenCalled()
    })

    it('should return error if currency is not EUR', async () => {
      const usdResponse: ApiResult<PriceData> = {
        success: true,
        data: {
          isin: 'IE00B1234567',
          ticker: 'TEST.MI',
          name: 'Test ETF',
          price: 110,
          currency: 'USD',
          currentValue: 1100,
          timestamp: new Date().toISOString(),
          source: 'Yahoo Finance'
        }
      }
      vi.mocked(getPriceByISIN).mockResolvedValueOnce(usdResponse)

      const result = await updateInvestmentPrice(uid, mockInvestment)

      expect(result.success).toBe(false)
      expect(result.error).toContain('EUR ammesso')

      // Check that updateInvestment was called with an error containing USD
      const calls = vi.mocked(updateInvestment).mock.calls
      const inv1Call = calls.find(call => call[1] === 'inv-1')
      expect(inv1Call).toBeDefined()
      const updateData = inv1Call![2] as Partial<Investment>
      expect(updateData.lastUpdateError).toContain('USD')
    })
  })

  describe('updateKindergartenInvestmentPrice', () => {
    it('should update KG investment price successfully', async () => {
      vi.mocked(getPriceByISIN).mockResolvedValueOnce({
        success: true,
        data: {
          isin: 'IE00B1234567',
          ticker: 'TEST.MI',
          name: 'KG ETF',
          price: 120,
          currency: 'EUR',
          currentValue: 1200,
          timestamp: new Date().toISOString(),
          source: 'Yahoo Finance'
        }
      })

      vi.mocked(updateKindergartenInvestment).mockResolvedValueOnce({ success: true, data: undefined })

      const result = await updateKindergartenInvestmentPrice(uid, mockKGInvestment)

      expect(result.success).toBe(true)
      expect(updateKindergartenInvestment).toHaveBeenCalledWith(uid, 'kg-inv-1', expect.objectContaining({
        currentPrice: 120,
        priceSource: 'Yahoo Finance'
      }))
      expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({
        entityType: 'investment',
        entityId: 'kg-inv-1'
      }))
    })
  })

  describe('updateKindergartenPACPrice', () => {
    it('should update KG PAC price successfully', async () => {
      vi.mocked(getPriceByISIN).mockResolvedValueOnce({
        success: true,
        data: {
          isin: 'IE00B7890123',
          ticker: 'PAC.MI',
          name: 'KG PAC',
          price: 110,
          currency: 'EUR',
          currentValue: 5500,
          timestamp: new Date().toISOString(),
          source: 'Yahoo Finance'
        }
      })

      vi.mocked(updateKindergartenPAC).mockResolvedValueOnce({ success: true, data: undefined })

      const result = await updateKindergartenPACPrice(uid, mockKGPAC)

      expect(result.success).toBe(true)
      expect(updateKindergartenPAC).toHaveBeenCalledWith(uid, 'kg-pac-1', expect.objectContaining({
        currentValue: 5500,
        priceSource: 'Yahoo Finance'
      }))
    })
  })

  describe('updateAllKindergartenPrices', () => {
    it('should update all KG investments and PACs with delay', async () => {
      vi.mocked(getKindergartenInvestments).mockResolvedValueOnce({
        success: true,
        data: [mockKGInvestment]
      })
      vi.mocked(getKindergartenPACs).mockResolvedValueOnce({
        success: true,
        data: [mockKGPAC]
      })

      const successResponse: ApiResult<PriceData> = {
        success: true,
        data: {
          isin: 'ISIN', ticker: 'T', name: 'N', price: 100, currency: 'EUR', currentValue: 1000, timestamp: '', source: ''
        }
      }
      vi.mocked(getPriceByISIN).mockResolvedValue(successResponse)
      vi.mocked(updateKindergartenInvestment).mockResolvedValue({ success: true, data: undefined })
      vi.mocked(updateKindergartenPAC).mockResolvedValue({ success: true, data: undefined })

      const onProgress = vi.fn()
      const promise = updateAllKindergartenPrices(uid, { onProgress })

      await vi.runAllTimersAsync()
      const result = await promise

      expect(result.success).toBe(true)
      expect(result.data?.total).toBe(2)
      expect(result.data?.successCount).toBe(2)
      expect(onProgress).toHaveBeenCalledTimes(2)
    })
  })
})
