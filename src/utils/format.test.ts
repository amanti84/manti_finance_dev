import { describe, it, expect } from 'vitest'
import { formatCurrency } from './format'

describe('formatCurrency', () => {
  // Happy path
  it('should format a positive number correctly', () => {
    const result = formatCurrency(1000.5)
    // Matches digits and decimals, ignoring specific thousand separators or spaces that might vary by env
    expect(result).toMatch(/1.*000,50.*€/)
  })

  // Edge case
  it('should format zero correctly', () => {
    const result = formatCurrency(0)
    expect(result).toMatch(/0,00.*€/)
  })

  // Error/Boundary Case
  it('should handle NaN gracefully by returning 0,00 €', () => {
    const result = formatCurrency(NaN)
    expect(result).toMatch(/0,00.*€/)
  })

  it('should handle negative numbers correctly', () => {
    const result = formatCurrency(-50.25)
    expect(result).toMatch(/-50,25.*€/)
  })
})
