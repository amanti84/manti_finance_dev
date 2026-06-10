import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ISINPickerField } from './ISINPickerField'
import * as isinService from '../../services/isin'

// Mock services
vi.mock('../../services/isin', () => ({
  isValidISIN: vi.fn(),
  formatISIN: vi.fn((isin: string) => isin.toUpperCase()),
  getPriceByISIN: vi.fn(),
  getUpdateFrequency: vi.fn(() => 'Test Frequency'),
}))

describe('ISINPickerField', () => {
  const defaultProps = {
    isin: '',
    ticker: '',
    tickerOnly: false,
    onISINChange: vi.fn(),
    onTickerChange: vi.fn(),
    onTickerOnlyChange: vi.fn(),
    onPriceResolved: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders ISIN input by default', () => {
    render(<ISINPickerField {...defaultProps} />)
    expect(screen.getByLabelText(/^Codice ISIN$/i)).toBeDefined()
    expect(screen.queryByLabelText(/^Ticker$/i)).toBeNull()
  })

  it('shows error for invalid ISIN', () => {
    vi.mocked(isinService.isValidISIN).mockReturnValue(false)
    render(<ISINPickerField {...defaultProps} isin="INVALID" />)
    expect(screen.getByText(/Formato ISIN non valido/i)).toBeDefined()
  })

  it('enables search button only for valid ISIN', () => {
    vi.mocked(isinService.isValidISIN).mockReturnValue(true)
    const { rerender } = render(<ISINPickerField {...defaultProps} isin="" />)
    expect(screen.getByRole('button', { name: /Cerca/i })).toBeDisabled()

    rerender(<ISINPickerField {...defaultProps} isin="IE00B4L5Y983" />)
    expect(screen.getByRole('button', { name: /Cerca/i })).not.toBeDisabled()
  })

  it('switches to Ticker mode when checkbox is clicked', () => {
    const onTickerOnlyChange = vi.fn()
    render(<ISINPickerField {...defaultProps} onTickerOnlyChange={onTickerOnlyChange} />)

    const checkbox = screen.getByLabelText(/Usa solo Ticker/i)
    fireEvent.click(checkbox)

    expect(onTickerOnlyChange).toHaveBeenCalledWith(true)
  })

  it('renders Ticker input when tickerOnly is true', () => {
    render(<ISINPickerField {...defaultProps} tickerOnly={true} />)
    expect(screen.getByLabelText(/^Ticker$/i)).toBeDefined()
    expect(screen.queryByLabelText(/^Codice ISIN$/i)).toBeNull()
  })

  it('calls getPriceByISIN when searching', async () => {
    vi.mocked(isinService.isValidISIN).mockReturnValue(true)
    vi.mocked(isinService.getPriceByISIN).mockResolvedValue({
      success: true,
      data: {
        isin: 'IE00B4L5Y983',
        ticker: 'SWDA.MI',
        name: 'iShares Core MSCI World',
        price: 90.5,
        currency: 'EUR',
        currentValue: 90.5,
        timestamp: new Date().toISOString(),
        source: 'Yahoo Finance'
      }
    })

    render(<ISINPickerField {...defaultProps} isin="IE00B4L5Y983" />)

    fireEvent.click(screen.getByRole('button', { name: /Cerca/i }))

    await waitFor(() => {
      expect(isinService.getPriceByISIN).toHaveBeenCalledWith('IE00B4L5Y983', 0, null, false)
    })

    expect(screen.getByText(/iShares Core MSCI World/i)).toBeDefined()
    expect(screen.getByText(/90.5000 EUR/i)).toBeDefined()
  })

  it('calls onPriceResolved when "Usa questi dati" is clicked', async () => {
    vi.mocked(isinService.isValidISIN).mockReturnValue(true)
    const mockData = {
      isin: 'IE00B4L5Y983',
      ticker: 'SWDA.MI',
      name: 'iShares Core MSCI World',
      price: 90.5,
      currency: 'EUR',
      currentValue: 90.5,
      timestamp: new Date().toISOString(),
      source: 'Yahoo Finance'
    }
    vi.mocked(isinService.getPriceByISIN).mockResolvedValue({
      success: true,
      data: mockData
    })

    const onPriceResolved = vi.fn()
    render(<ISINPickerField {...defaultProps} isin="IE00B4L5Y983" onPriceResolved={onPriceResolved} />)

    fireEvent.click(screen.getByRole('button', { name: /Cerca/i }))

    await waitFor(() => {
      expect(screen.getByText(/Usa questi dati/i)).toBeDefined()
    })

    fireEvent.click(screen.getByText(/Usa questi dati/i))

    expect(onPriceResolved).toHaveBeenCalledWith(90.5, 'EUR', 'iShares Core MSCI World')
  })

  it('shows error message when search fails', async () => {
    vi.mocked(isinService.isValidISIN).mockReturnValue(true)
    vi.mocked(isinService.getPriceByISIN).mockResolvedValue({
      success: false,
      error: 'ISIN non trovato'
    })

    render(<ISINPickerField {...defaultProps} isin="UNKNOWN" />)

    fireEvent.click(screen.getByRole('button', { name: /Cerca/i }))

    await waitFor(() => {
      expect(screen.getByText(/ISIN non trovato/i)).toBeDefined()
    })
  })
})
