/**
 * Kindergarten domain types — segregated portfolio for children.
 * Collections: users/{uid}/kindergarten_investments, users/{uid}/kindergarten_pacs
 * NO cross-import with main investment/PAC types.
 */

export interface KindergartenInvestment {
  id: string
  name: string
  ticker?: string
  category: 'etf' | 'fund' | 'stock' | 'bond' | 'other'
  purchaseDate: string        // ISO date
  purchasePrice: number       // EUR
  quantity: number
  currentPrice: number        // EUR — updated manually or via feed
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface KindergartenPAC {
  id: string
  name: string
  ticker?: string
  monthlyAmount: number       // EUR — rata mensile
  startDate: string           // ISO date
  targetYears: number
  currentValue: number        // EUR — valore attuale
  totalInvested: number       // EUR — totale versato
  lastPaymentDate?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface KindergartenMovement {
  id: string
  type: 'investment_buy' | 'investment_sell' | 'pac_payment' | 'pac_rebalance'
  referenceId: string         // ID investment o PAC
  referenceName: string
  amount: number              // EUR
  date: string                // ISO date
  notes?: string
  createdAt: string
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
