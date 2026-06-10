/**
 * Kindergarten domain types — segregated portfolio for children.
 * Collections: users/{uid}/kindergarten_investments, users/{uid}/kindergarten_pacs
 * NO cross-import with main investment/PAC types.
 */
import type { Timestamp } from 'firebase/firestore'

export interface KindergartenInvestment {
  id: string
  name: string
  isin?: string
  ticker?: string
  tickerOnly?: boolean
  autoUpdate?: boolean
  category: 'etf' | 'fund' | 'stock' | 'bond' | 'other'
  purchaseDate: string        // ISO date
  purchasePrice: number       // EUR
  quantity: number
  currentPrice: number        // EUR — updated manually or via feed
  notes?: string
  lastPriceUpdate?: Timestamp | string
  lastUpdateError?: string | null
  lastUpdateAttempt?: Timestamp | null
  priceSource?: string
  yahooSymbol?: string
  createdAt: string | Timestamp
  updatedAt: string | Timestamp
}

export interface KindergartenPAC {
  id: string
  name: string
  isin?: string
  ticker?: string
  tickerOnly?: boolean
  autoUpdate?: boolean
  monthlyAmount: number       // EUR — rata mensile
  quantity?: number           // Added to support currentPrice * quantity = currentValue
  startDate: string           // ISO date
  targetYears: number
  currentValue: number        // EUR — valore attuale
  totalInvested: number       // EUR — totale versato
  lastPaymentDate?: string | Timestamp
  notes?: string
  lastPriceUpdate?: Timestamp | string
  lastUpdateError?: string | null
  lastUpdateAttempt?: Timestamp | null
  priceSource?: string
  yahooSymbol?: string
  createdAt: string | Timestamp
  updatedAt: string | Timestamp
}

export interface KindergartenMovement {
  id: string
  type: 'investment_buy' | 'investment_sell' | 'pac_payment' | 'pac_rebalance'
  referenceId: string         // ID investment o PAC
  referenceName: string
  amount: number              // EUR
  date: string                // ISO date
  notes?: string
  createdAt: string | Timestamp
}

export interface KindergartenKPIs {
  totalInvested: number
  currentValue: number
  gainLoss: number
  gainLossPercent: number
  totalPACMonthly: number
  totalPACInvested: number
  totalPACValue: number
  pacGainLoss: number
  pacGainLossPercent: number
  grandTotalInvested: number
  grandTotalValue: number
  grandTotalGainLoss: number
  grandTotalGainLossPercent: number
}
