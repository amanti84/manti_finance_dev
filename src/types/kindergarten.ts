/**
 * Kindergarten domain types — segregated portfolio for children.
 * Collections: users/{uid}/kindergarten_investments, users/{uid}/kindergarten_pacs
 * NO cross-import with main investment/PAC types.
 */
import type { Timestamp } from 'firebase/firestore'

export type KGPACFrequency = 'daily' | 'biweekly' | 'monthly'

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
  // --- Frequenza versamenti ---
  frequency: KGPACFrequency   // 'daily' | 'biweekly' | 'monthly'
  dayOfMonth?: number         // 1-28 — usato solo se frequency === 'monthly'
  // --- Importi ---
  monthlyAmount: number       // EUR — rata per periodo
  quantity?: number
  startDate: string           // ISO date
  targetYears: number
  currentValue: number        // EUR — valore attuale
  totalInvested: number       // EUR — totale versato (aggregato, aggiornato ad ogni payment)
  lastPaymentDate?: string    // ISO date — data ultimo versamento effettivo
  nextPaymentDate?: string    // ISO date — calcolata automaticamente
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
  date: string                // ISO date
  amount: number              // EUR
  priceAtPayment: number      // EUR — prezzo quota al momento del versamento
  quantityPurchased: number   // calcolato: amount / priceAtPayment
  auto: boolean               // true se registrato automaticamente
  notes?: string
  createdAt: Timestamp
  updatedAt: Timestamp
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
