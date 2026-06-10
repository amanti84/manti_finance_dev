import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  isValidISIN,
  formatISIN,
  getAssetType,
  getUpdateFrequency,
  getPriceByISIN,
} from './isin'

// Mock fetch
global.fetch = vi.fn()

describe('ISIN Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock import.meta.env
    vi.stubEnv('VITE_FIREBASE_PROJECT_ID', 'manti-finance-dev')
  })

  describe('isValidISIN', () => {
    it('should return true for valid ISINs', () => {
      expect(isValidISIN('IE00B4L5Y983')).toBe(true)
      expect(isValidISIN('IT0001234567')).toBe(true)
      expect(isValidISIN('LU1234567890')).toBe(true)
    })

    it('should return false for invalid ISINs', () => {
      expect(isValidISIN('IE00B4L5Y98')).toBe(false) // too short
      expect(isValidISIN('IE00B4L5Y9833')).toBe(false) // too long
      expect(isValidISIN('1E00B4L5Y983')).toBe(false) // wrong prefix
      expect(isValidISIN('IE00B4L5Y98A')).toBe(false) // last digit not a number
    })
  })

  describe('formatISIN', () => {
    it('should trim and uppercase ISIN', () => {
      expect(formatISIN(' ie00b4l5y983 ')).toBe('IE00B4L5Y983')
    })
  })

  describe('getAssetType', () => {
    it('should return etf for IE, GB, DE, FR, NL prefixes', () => {
      expect(getAssetType('IE00B4L5Y983')).toBe('etf')
      expect(getAssetType('GB00B1234567')).toBe('etf')
      expect(getAssetType('DE0001234567')).toBe('etf')
      expect(getAssetType('FR0001234567')).toBe('etf')
      expect(getAssetType('NL0001234567')).toBe('etf')
    })

    it('should return fund-it for IT prefix', () => {
      expect(getAssetType('IT0001234567')).toBe('fund-it')
    })

    it('should return fund-lu for LU prefix', () => {
      expect(getAssetType('LU0001234567')).toBe('fund-lu')
    })

    it('should return other for other prefixes', () => {
      expect(getAssetType('US0001234567')).toBe('other')
    })
  })

  describe('getUpdateFrequency', () => {
    it('should return correct frequency for each type', () => {
      expect(getUpdateFrequency('IE00B4L5Y983')).toBe('Tempo reale (ogni 30 minuti)')
      expect(getUpdateFrequency('IT0001234567')).toBe('Giornaliero (NAV ore 18:00)')
      expect(getUpdateFrequency('LU0001234567')).toBe('Giornaliero (NAV fine giornata)')
      expect(getUpdateFrequency('US0001234567')).toBe('Variabile')
    })
  })

  describe('getPriceByISIN', () => {
    it('should return error if neither ISIN nor ticker is provided', async () => {
      const result = await getPriceByISIN(null)
      expect(result.success).toBe(false)
      expect(result.error).toBe('Necessario ISIN o ticker')
    })

    it('should call CF with ISIN and return data on success', async () => {
      const mockPriceResult = {
        success: true,
        data: {
          isin: 'IE00BYX2JD69',
          price: 100.5,
          currency: 'EUR',
          source: 'Yahoo Finance',
          fetchedAt: { _seconds: 1718016000 },
          symbol: 'SWDA.MI'
        }
      }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockPriceResult,
      } as any)

      const result = await getPriceByISIN('IE00BYX2JD69', 10)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.price).toBe(100.5)
        expect(result.data.currentValue).toBe(1005)
        expect(result.data.source).toBe('Yahoo Finance')
      }
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('isin=IE00BYX2JD69'))
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('shares=10'))
    })

    it('should call CF with ticker if tickerOnly is true', async () => {
      const mockPriceResult = {
        success: true,
        data: {
          isin: 'BTC-EUR',
          price: 60000,
          currency: 'EUR',
          source: 'CoinGecko',
          fetchedAt: { _seconds: 1718016000 },
          symbol: 'BTC'
        }
      }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockPriceResult,
      } as any)

      const result = await getPriceByISIN(null, 0.5, 'BTC', true)

      expect(result.success).toBe(true)
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('ticker=BTC'))

      const lastCall = vi.mocked(fetch).mock.calls[0][0] as string
      expect(lastCall).not.toContain('isin=')
    })

    it('should return error if CF returns success: false', async () => {
      const mockErrorResponse = {
        success: false,
        error: 'ISIN not found'
      }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockErrorResponse,
      } as any)

      const result = await getPriceByISIN('INVALID')
      expect(result.success).toBe(false)
      expect(result.error).toBe('ISIN not found')
    })

    it('should handle fetch errors', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))

      const result = await getPriceByISIN('IE00BYX2JD69')
      expect(result.success).toBe(false)
      expect(result.error).toBe('Network error')
    })
  })
})
