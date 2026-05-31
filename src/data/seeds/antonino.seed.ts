import type { PacConfig } from '../../types'

// Schema PAC (collezione pacs)
export const pacsSeed: Partial<PacConfig>[] = [
  {
    name: 'iShares Core MSCI World',
    isin: 'IE00B4L5Y983',
    ticker: 'IWDA',
    monthlyAmount: 500,
    startDate: '2023-01-01',
    active: true,
    autoUpdate: true,
    platform: 'Directa',
    monthlyDays: [5]
  },
  {
    name: 'Vanguard FTSE All-World',
    isin: 'IE00BK5BQT80',
    ticker: 'VWCE',
    monthlyAmount: 300,
    startDate: '2023-06-01',
    active: true,
    autoUpdate: true,
    platform: 'Fineco',
    monthlyDays: [5, 20]
  }
]

// Schema Investment (collezione investments)
// {
//   name: string             // nome strumento
//   isin?: string
//   ticker?: string
//   type: string             // 'ETF' | 'Stock' | 'Bond' | 'Crypto' | 'Other'
//   amountInvested: number   // capitale investito €
//   currentValue: number     // valore attuale €
//   quantity?: number        // numero quote/azioni
//   purchaseDate: string     // ISO date
//   platform?: string
//   notes?: string
// }
export const investmentsSeed = [
  {
    name: 'iShares Core MSCI World',
    isin: 'IE00B4L5Y983',
    ticker: 'IWDA',
    type: 'ETF',
    amountInvested: 3500,
    currentValue: 4115,
    quantity: 50,
    purchaseDate: '2023-01-15',
    platform: 'Directa'
  },
  {
    name: 'Vanguard FTSE All-World',
    isin: 'IE00BK5BQT80',
    ticker: 'VWCE',
    type: 'ETF',
    amountInvested: 3200,
    currentValue: 3063,
    quantity: 30,
    purchaseDate: '2023-06-10',
    platform: 'Fineco'
  },
  {
    name: 'Apple Inc.',
    ticker: 'AAPL',
    type: 'Stock',
    amountInvested: 1500,
    currentValue: 1905,
    quantity: 10,
    purchaseDate: '2024-01-05',
    platform: 'Fineco'
  }
]
