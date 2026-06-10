/**
 * Kindergarten domain types — segregated portfolio for children.
 * Collections: users/{uid}/kindergarten_investments, users/{uid}/kindergarten_pacs
 * NO cross-import with main investment/PAC types.
 */
import type { Timestamp } from 'firebase/firestore'
import type { PACSchedule } from './pacFrequency'

export interface KindergartenInvestment {
  id: string
  name: string
  isin?: string
  ticker?: string
  tickerOnly?: boolean
  autoUpdate?: boolean
  category: 'etf' | 'fund' | 'stock' | 'bond' | 'other'
  purchaseDate: string
  purchasePrice: number
  quantity: number
  currentPrice: number
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
  // --- Scheduling ---
  schedule: PACSchedule         // unico campo che sostituisce frequency/dayOfMonth
  // --- Importi ---
  monthlyAmount: number         // EUR — importo rata
  quantity?: number
  startDate: string             // ISO date
  targetYears: number
  currentValue: number
  totalInvested: number
  lastPaymentDate?: string      // ISO date — ultimo versamento effettivo
  nextPaymentDate?: string      // ISO date — calcolata automaticamente
  notes?: string
  lastPriceUpdate?: Timestamp | string
  lastUpdateError?: string | null
  lastUpdateAttempt?: Timestamp | null
  priceSource?: string
  yahooSymbol?: string
  createdAt: string | Timestamp
  updatedAt: string | Timestamp
}

export interface KindergartenPACPayment {
  id: string
  pacId: string
  pacName: string
  date: string
  amount: number
  priceAtPayment: number
  quantityPurchased: number
  auto: boolean
  notes?: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface KindergartenMovement {
  id: string
  type: 'investment_buy' | 'investment_sell' | 'pac_payment' | 'pac_rebalance'
  referenceId: string
  referenceName: string
  amount: number
  date: string
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
