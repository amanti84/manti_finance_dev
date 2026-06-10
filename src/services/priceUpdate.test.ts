import { describe, it, expect, vi, beforeEach } from 'vitest'
import { updateInvestmentPrice, updateAllPrices } from './priceUpdate'
import { getPriceByISIN } from './isin'
import { updateInvestment } from './investment'
import { logAudit } from './audit'
import { Timestamp } from 'firebase/firestore'
import { type Investment, type ApiResult, type PriceData } from '../types'

// Mock services
vi.mock('./isin')
vi.mock('./investment')
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

    it('should handle API failure', async () => {
      const errorResponse: ApiResult<PriceData> = {
        success: false,
        error: 'API Error'
      }
      vi.mocked(getPriceByISIN).mockResolvedValueOnce(errorResponse)

      const result = await updateInvestmentPrice(uid, mockInvestment)

      expect(result.success).toBe(false)
      expect(result.error).toBe('API Error')
      expect(updateInvestment).toHaveBeenCalledWith(uid, 'inv-1', expect.objectContaining({
        lastUpdateError: 'API Error'
      }))
    })

    it('should return error if no ISIN and not tickerOnly', async () => {
      const invNoIsin = { ...mockInvestment, isin: undefined, tickerOnly: false }
      const result = await updateInvestmentPrice(uid, invNoIsin as unknown as Investment)
      expect(result.success).toBe(false)
      expect(result.error).toContain('Necessario ISIN o ticker')
    })
  })

  describe('updateAllPrices', () => {
    it('should update multiple investments with progress tracking', async () => {
      const investments = [
        mockInvestment,
        { ...mockInvestment, id: 'inv-2', name: 'Test 2' }
      ]

      const successResponse: ApiResult<PriceData> = {
        success: true,
        data: {
          isin: 'ISIN', ticker: 'T', name: 'N', price: 100, currency: 'EUR', currentValue: 1000, timestamp: '', source: ''
        }
      }
      vi.mocked(getPriceByISIN).mockResolvedValue(successResponse)

      const voidResponse: ApiResult<void> = { success: true, data: undefined }
      vi.mocked(updateInvestment).mockResolvedValue(voidResponse)

      const onProgress = vi.fn()

      const promise = updateAllPrices(uid, investments, { onProgress })

      // Fast-forward through delays
      await vi.runAllTimersAsync()

      const result = await promise

      expect(result.success).toBe(true)
      expect(result.data?.successCount).toBe(2)
      expect(onProgress).toHaveBeenCalledTimes(2)
      expect(onProgress).toHaveBeenNthCalledWith(1, 1, 2, 'Test ETF')
      expect(onProgress).toHaveBeenNthCalledWith(2, 2, 2, 'Test 2')
    })

    it('should filter by autoUpdate if option is set', async () => {
      const investments = [
        mockInvestment,
        { ...mockInvestment, id: 'inv-2', autoUpdate: false }
      ]

      const successResponse: ApiResult<PriceData> = {
        success: true,
        data: {
          isin: 'ISIN', ticker: 'T', name: 'N', price: 100, currency: 'EUR', currentValue: 1000, timestamp: '', source: ''
        }
      }
      vi.mocked(getPriceByISIN).mockResolvedValue(successResponse)

      const voidResponse: ApiResult<void> = { success: true, data: undefined }
      vi.mocked(updateInvestment).mockResolvedValue(voidResponse)

      const result = await updateAllPrices(uid, investments, { autoUpdateOnly: true })

      expect(result.success).toBe(true)
      expect(result.data?.total).toBe(1)
      expect(result.data?.successCount).toBe(1)
    })
  })
})
